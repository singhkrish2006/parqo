import { describe, expect, it } from "vitest";
import {
  defaultPriceNote,
  isInsideServiceArea,
  validateSuggestion,
  type SpotSuggestionInput,
} from "@/lib/suggestions";

const valid: SpotSuggestionInput = {
  name: "Lajpat Nagar Central Market",
  ownership: "public",
  type: "On-street parking",
  lat: 28.5677,
  lng: 77.2431,
  pricePerHour: 20,
  priceNote: "",
  charging: false,
  connectorType: null,
  chargingSpeedKw: null,
  availability: null,
};

describe("validateSuggestion", () => {
  it("accepts a well-formed public suggestion", () => {
    expect(validateSuggestion(valid)).toBeNull();
  });

  it("rejects bad names, types and prices", () => {
    expect(validateSuggestion({ ...valid, name: "ab" })).not.toBeNull();
    expect(validateSuggestion({ ...valid, type: "Private driveway" })).not.toBeNull();
    expect(validateSuggestion({ ...valid, pricePerHour: -1 })).not.toBeNull();
    expect(validateSuggestion({ ...valid, pricePerHour: 501 })).not.toBeNull();
    expect(validateSuggestion({ ...valid, pricePerHour: 12.5 })).not.toBeNull();
    expect(validateSuggestion({ ...valid, pricePerHour: Number.NaN })).not.toBeNull();
  });

  it("rejects locations outside Delhi-NCR or missing", () => {
    expect(validateSuggestion({ ...valid, lat: 19.07, lng: 72.87 })).not.toBeNull();
    expect(validateSuggestion({ ...valid, lat: Number.NaN, lng: Number.NaN })).not.toBeNull();
  });

  it("requires a connector when EV charging is offered", () => {
    expect(validateSuggestion({ ...valid, charging: true })).not.toBeNull();
    expect(
      validateSuggestion({
        ...valid,
        charging: true,
        connectorType: "Type 2 (AC)",
        chargingSpeedKw: 7,
      }),
    ).toBeNull();
    expect(
      validateSuggestion({
        ...valid,
        charging: true,
        connectorType: "Type 2 (AC)",
        chargingSpeedKw: 900,
      }),
    ).not.toBeNull();
  });

  it("requires sensible hours for private spots", () => {
    const priv: SpotSuggestionInput = {
      ...valid,
      ownership: "private",
      type: "Private driveway",
      availability: { days: [1, 2], start: "09:00", end: "18:00" },
    };
    expect(validateSuggestion(priv)).toBeNull();
    expect(validateSuggestion({ ...priv, availability: null })).not.toBeNull();
    expect(
      validateSuggestion({ ...priv, availability: { days: [], start: "09:00", end: "18:00" } }),
    ).not.toBeNull();
    expect(
      validateSuggestion({ ...priv, availability: { days: [1], start: "18:00", end: "09:00" } }),
    ).not.toBeNull();
  });
});

describe("helpers", () => {
  it("knows the service area", () => {
    expect(isInsideServiceArea(28.6139, 77.209)).toBe(true);
    expect(isInsideServiceArea(12.97, 77.59)).toBe(false);
  });

  it("writes a default pricing note", () => {
    expect(defaultPriceNote("private", 15)).toBe("₹15/hr — set by the owner");
    expect(defaultPriceNote("public", 0)).toContain("Free");
    expect(defaultPriceNote("public", 20)).toContain("₹20/hr");
  });
});
