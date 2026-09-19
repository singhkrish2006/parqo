import type { AvailabilityWindow, Ownership } from "@/data/spots";

/** Rough Delhi-NCR box. Suggestions outside it are rejected client- and
 * server-side (see supabase/schema.sql). */
export const SERVICE_AREA = { minLat: 28.2, maxLat: 29.0, minLng: 76.7, maxLng: 77.7 };

export const PUBLIC_TYPES = [
  "On-street parking",
  "Surface lot",
  "Multilevel parking",
  "Basement parking",
] as const;

export const PRIVATE_TYPES = ["Private driveway", "Private society parking"] as const;

export const CONNECTOR_TYPES = ["Type 2 (AC)", "CCS2 (DC fast)", "Bharat AC-001"] as const;

export type SpotSuggestionInput = {
  name: string;
  ownership: Ownership;
  type: string;
  lat: number;
  lng: number;
  pricePerHour: number;
  priceNote: string;
  charging: boolean;
  connectorType: string | null;
  chargingSpeedKw: number | null;
  availability: AvailabilityWindow;
};

export function isInsideServiceArea(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= SERVICE_AREA.minLat &&
    lat <= SERVICE_AREA.maxLat &&
    lng >= SERVICE_AREA.minLng &&
    lng <= SERVICE_AREA.maxLng
  );
}

export function defaultPriceNote(ownership: Ownership, pricePerHour: number): string {
  if (ownership === "private") return `₹${pricePerHour}/hr — set by the owner`;
  return pricePerHour === 0
    ? "Free — reported by a driver, unverified"
    : `₹${pricePerHour}/hr — reported by a driver, unverified`;
}

/** Returns a human-readable problem, or null when the suggestion is valid. */
export function validateSuggestion(input: SpotSuggestionInput): string | null {
  const name = input.name.trim();
  if (name.length < 3 || name.length > 120) {
    return "Give the spot a name between 3 and 120 characters.";
  }

  const allowedTypes: readonly string[] =
    input.ownership === "private" ? PRIVATE_TYPES : PUBLIC_TYPES;
  if (!allowedTypes.includes(input.type)) {
    return "Pick a spot type.";
  }

  if (!isInsideServiceArea(input.lat, input.lng)) {
    return "Place the spot on the map inside Delhi-NCR.";
  }

  if (!Number.isInteger(input.pricePerHour) || input.pricePerHour < 0 || input.pricePerHour > 500) {
    return "Price must be a whole number of rupees per hour, from 0 to 500.";
  }

  if (input.priceNote.length > 160) {
    return "Keep the pricing note under 160 characters.";
  }

  if (input.charging) {
    if (!input.connectorType || !(CONNECTOR_TYPES as readonly string[]).includes(input.connectorType)) {
      return "Choose the EV connector type.";
    }
    if (
      input.chargingSpeedKw !== null &&
      (!Number.isFinite(input.chargingSpeedKw) || input.chargingSpeedKw <= 0 || input.chargingSpeedKw > 350)
    ) {
      return "Charging speed must be between 0 and 350 kW.";
    }
  }

  if (input.ownership === "private") {
    const window = input.availability;
    if (!window || window.days.length === 0) {
      return "Choose the days this private spot can be rented.";
    }
    if (window.start >= window.end) {
      return "The end time must be after the start time.";
    }
  }

  return null;
}
