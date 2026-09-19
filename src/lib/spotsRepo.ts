import { supabase } from "@/lib/supabaseClient";
import {
  spots as seedSpots,
  type AvailabilityWindow,
  type Spot,
  type SpotStatus,
} from "@/data/spots";
import { getDeviceId } from "@/lib/deviceId";

type SpotRow = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  ownership: "public" | "private";
  type: string;
  price_per_hour: number;
  price_note: string;
  charging: boolean;
  connector_type: string | null;
  charging_speed_kw: number | null;
  availability: AvailabilityWindow;
  verified: boolean;
  status: SpotStatus;
};

function fromRow(row: SpotRow): Spot {
  return {
    id: row.id,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    ownership: row.ownership,
    type: row.type,
    pricePerHour: row.price_per_hour,
    priceNote: row.price_note,
    charging: row.charging,
    connectorType: row.connector_type,
    chargingSpeedKw: row.charging_speed_kw,
    availability: row.availability,
    verified: row.verified,
    status: row.status,
  };
}

/** Live data when Supabase is configured, otherwise the local seed list. */
export async function fetchSpots(): Promise<{ spots: Spot[]; live: boolean }> {
  if (!supabase) return { spots: seedSpots, live: false };
  const { data, error } = await supabase.from("spots").select("*");
  if (error || !data) return { spots: seedSpots, live: false };
  return { spots: data.map(fromRow), live: true };
}

/** Calls onChange whenever any spot's status changes anywhere (any user). */
export function subscribeToSpotUpdates(onChange: (spot: Spot) => void) {
  const client = supabase;
  if (!client) return () => {};
  const channel = client
    .channel("spots-changes")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "spots" },
      (payload) => onChange(fromRow(payload.new as SpotRow)),
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

export async function submitReport(
  spotId: string,
  status: SpotStatus,
): Promise<{ ok: boolean }> {
  if (!supabase) return { ok: false };
  const { error } = await supabase
    .from("reports")
    .insert({ spot_id: spotId, status, reporter_device_id: getDeviceId() });
  return { ok: !error };
}

/** How many distinct devices reported the same current status recently —
 * a lightweight trust signal without needing real user accounts. */
export async function getRecentAgreement(
  spotId: string,
  status: SpotStatus,
  withinMinutes = 30,
): Promise<number> {
  if (!supabase) return 0;
  const since = new Date(Date.now() - withinMinutes * 60_000).toISOString();
  const { data, error } = await supabase
    .from("reports")
    .select("reporter_device_id")
    .eq("spot_id", spotId)
    .eq("status", status)
    .gte("created_at", since);
  if (error || !data) return 0;
  return new Set(data.map((r) => r.reporter_device_id).filter(Boolean)).size;
}
