import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";

const BASE_URL = process.env.NOMINATIM_BASE_URL ?? "https://nominatim.openstreetmap.org";
// Nominatim's usage policy requires an identifying User-Agent with a way to
// contact you. Set GEOCODER_CONTACT_EMAIL in production.
const CONTACT = process.env.GEOCODER_CONTACT_EMAIL ?? "contact-not-configured";

export async function GET(request: NextRequest) {
  const limit = rateLimit(`geocode:${clientIp(request)}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 120) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const url = new URL("/search", BASE_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "in");
  url.searchParams.set("viewbox", "76.8,28.9,77.6,28.3");
  url.searchParams.set("bounded", "0");

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": `Parqo/1.0 (${CONTACT})`, "Accept-Language": "en" },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(6000),
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: "upstream_error" }, { status: 502 });
    }
    const results = (await upstream.json()) as { lat: string; lon: string }[];
    if (results.length === 0) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(
      { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) },
      { headers: { "Cache-Control": "public, max-age=3600" } },
    );
  } catch {
    return NextResponse.json({ error: "upstream_unreachable" }, { status: 502 });
  }
}
