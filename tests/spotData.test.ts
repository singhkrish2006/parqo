import { describe, expect, it } from "vitest";
import { metroParkings } from "@/data/metroParkings";
import { spots } from "@/data/spots";
import { isInsideServiceArea } from "@/lib/suggestions";

describe("spot catalogue integrity", () => {
  it("has unique ids and names", () => {
    expect(new Set(spots.map((s) => s.id)).size).toBe(spots.length);
    expect(new Set(spots.map((s) => s.name)).size).toBe(spots.length);
  });

  it("keeps every spot inside the service area", () => {
    for (const s of spots) {
      expect(isInsideServiceArea(s.lat, s.lng), s.name).toBe(true);
    }
  });

  it("has sane prices and a tariff note for each spot", () => {
    for (const s of spots) {
      expect(Number.isInteger(s.pricePerHour), s.name).toBe(true);
      expect(s.pricePerHour, s.name).toBeGreaterThanOrEqual(0);
      expect(s.pricePerHour, s.name).toBeLessThanOrEqual(500);
      expect(s.priceNote.length, s.name).toBeGreaterThan(0);
    }
  });

  it("describes EV connectors only where charging exists", () => {
    for (const s of spots) {
      if (s.charging) {
        expect(s.connectorType, s.name).toBeTruthy();
        expect(s.chargingSpeedKw, s.name).toBeGreaterThan(0);
      } else {
        expect(s.connectorType, s.name).toBeNull();
        expect(s.chargingSpeedKw, s.name).toBeNull();
      }
    }
  });

  it("gives private spots owner hours and public spots none", () => {
    for (const s of spots) {
      if (s.ownership === "private") {
        expect(s.availability, s.name).not.toBeNull();
        expect(s.availability!.start < s.availability!.end, s.name).toBe(true);
      } else {
        expect(s.availability, s.name).toBeNull();
      }
    }
  });

  it("has valid metro parking fallbacks", () => {
    expect(metroParkings.length).toBeGreaterThan(0);
    for (const m of metroParkings) {
      expect(isInsideServiceArea(m.lat, m.lng), m.name).toBe(true);
      expect(m.priceNote.length, m.name).toBeGreaterThan(0);
    }
  });
});
