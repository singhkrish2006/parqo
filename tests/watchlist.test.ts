// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { getDeviceId } from "@/lib/deviceId";
import { getWatchlist, toggleWatch } from "@/lib/watchlist";

beforeEach(() => localStorage.clear());

describe("watchlist", () => {
  it("adds, removes and persists spots", () => {
    expect(getWatchlist().size).toBe(0);
    expect(toggleWatch("a").has("a")).toBe(true);
    expect(getWatchlist().has("a")).toBe(true);
    expect(toggleWatch("a").has("a")).toBe(false);
    expect(getWatchlist().size).toBe(0);
  });

  it("survives corrupted storage", () => {
    localStorage.setItem("parqo:watchlist", "{not json");
    expect(getWatchlist().size).toBe(0);
  });
});

describe("device id", () => {
  it("is stable across calls and long enough for the database rules", () => {
    const first = getDeviceId();
    expect(first.length).toBeGreaterThanOrEqual(8);
    expect(getDeviceId()).toBe(first);
  });
});
