import { distanceKm } from "@/lib/geo";

export type MetroParking = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  pricePerHour: number;
  priceNote: string;
};

// DMRC's published car parking tariff is flat, not truly hourly: ₹30 up to
// 6 hrs, ₹50 up to 12 hrs, ₹60 beyond. Same policy at every station.
const DMRC_PRICE_NOTE = "₹30 flat up to 6 hrs, ₹50 up to 12 hrs (DMRC rate)";

export const metroParkings: MetroParking[] = [
  {
    id: "metro-rajiv-chowk",
    name: "Rajiv Chowk Metro Parking",
    lat: 28.6328,
    lng: 77.2197,
    pricePerHour: 30,
    priceNote: DMRC_PRICE_NOTE,
  },
  {
    id: "metro-saket",
    name: "Saket Metro Parking",
    lat: 28.5245,
    lng: 77.21,
    pricePerHour: 30,
    priceNote: DMRC_PRICE_NOTE,
  },
  {
    id: "metro-kailash-colony",
    name: "Kailash Colony Metro Parking",
    lat: 28.5578,
    lng: 77.2431,
    pricePerHour: 30,
    priceNote: DMRC_PRICE_NOTE,
  },
  {
    id: "metro-ina",
    name: "INA Metro Parking",
    lat: 28.5745,
    lng: 77.2094,
    pricePerHour: 30,
    priceNote: DMRC_PRICE_NOTE,
  },
  {
    id: "metro-karol-bagh",
    name: "Karol Bagh Metro Parking",
    lat: 28.6517,
    lng: 77.19,
    pricePerHour: 30,
    priceNote: DMRC_PRICE_NOTE,
  },
];

export function nearestMetroParking(origin: [number, number]): {
  metro: MetroParking;
  distance: number;
} {
  let best = metroParkings[0];
  let bestDist = distanceKm(origin, [best.lat, best.lng]);
  for (const m of metroParkings.slice(1)) {
    const d = distanceKm(origin, [m.lat, m.lng]);
    if (d < bestDist) {
      best = m;
      bestDist = d;
    }
  }
  return { metro: best, distance: bestDist };
}
