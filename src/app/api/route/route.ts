import { NextRequest, NextResponse } from "next/server";
import { distanceKm } from "@/lib/geo";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";

// The public OSRM demo server is fine for early testing only — point this at
// your own OSRM instance or a paid routing provider before real traffic.
const OSRM_BASE_URL = process.env.OSRM_BASE_URL ?? "https://router.project-osrm.org";

const MAX_ROUTE_KM = 150;

function parsePoint(value: string | null): [number, number] | null {
  if (!value) return null;
  const [lat, lng] = value.split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  // Rough India bounding box — keeps this from being an open routing proxy.
  if (lat < 6 || lat > 38 || lng < 68 || lng > 98) return null;
  return [lat, lng];
}

export async function GET(request: NextRequest) {
  const limit = rateLimit(`route:${clientIp(request)}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const from = parsePoint(request.nextUrl.searchParams.get("from"));
  const to = parsePoint(request.nextUrl.searchParams.get("to"));
  if (!from || !to || distanceKm(from, to) > MAX_ROUTE_KM) {
    return NextResponse.json({ error: "invalid_points" }, { status: 400 });
  }

  const url =
    `${OSRM_BASE_URL}/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}` +
    `?overview=full&geometries=geojson`;

  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!upstream.ok) {
      return NextResponse.json({ error: "upstream_error" }, { status: 502 });
    }
    const data = await upstream.json();
    const coords = data?.routes?.[0]?.geometry?.coordinates as
      | [number, number][]
      | undefined;
    if (!coords) {
      return NextResponse.json({ error: "no_route" }, { status: 404 });
    }
    return NextResponse.json({ path: coords.map(([lng, lat]) => [lat, lng]) });
  } catch {
    return NextResponse.json({ error: "upstream_unreachable" }, { status: 502 });
  }
}
