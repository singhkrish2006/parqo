import { describe, expect, it } from "vitest";
import { describeAvailability, isAvailableNow } from "@/lib/availability";

const weekdays = { days: [1, 2, 3, 4, 5], start: "09:00", end: "18:00" };

describe("isAvailableNow", () => {
  it("treats a missing window as always available", () => {
    expect(isAvailableNow(null, new Date(2026, 8, 19, 3, 0))).toBe(true);
  });

  it("is available inside the window on a listed day", () => {
    // Tuesday 15 Sep 2026, 10:00
    expect(isAvailableNow(weekdays, new Date(2026, 8, 15, 10, 0))).toBe(true);
  });

  it("is unavailable on an unlisted day", () => {
    // Saturday 19 Sep 2026, 10:00
    expect(isAvailableNow(weekdays, new Date(2026, 8, 19, 10, 0))).toBe(false);
  });

  it("includes the start minute and excludes the end minute", () => {
    expect(isAvailableNow(weekdays, new Date(2026, 8, 15, 9, 0))).toBe(true);
    expect(isAvailableNow(weekdays, new Date(2026, 8, 15, 18, 0))).toBe(false);
  });
});

describe("describeAvailability", () => {
  it("summarises common patterns", () => {
    expect(describeAvailability(null)).toBe("Available anytime");
    expect(describeAvailability(weekdays)).toBe("Weekdays, 9am–6pm");
    expect(
      describeAvailability({ days: [0, 1, 2, 3, 4, 5, 6], start: "08:00", end: "22:00" }),
    ).toBe("Every day, 8am–10pm");
  });

  it("lists custom days", () => {
    expect(describeAvailability({ days: [1, 3], start: "09:30", end: "17:00" })).toBe(
      "Mon, Wed, 9:30am–5pm",
    );
  });
});
