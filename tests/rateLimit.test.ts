import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/server/rateLimit";

beforeEach(() => resetRateLimits());

describe("rateLimit", () => {
  it("allows up to the limit and then blocks with a retry hint", () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("k", 3, 60_000, now).ok).toBe(true);
    }
    const blocked = rateLimit("k", 3, 60_000, now + 10_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(50);
  });

  it("resets after the window", () => {
    const now = 1_000_000;
    rateLimit("k", 1, 1000, now);
    expect(rateLimit("k", 1, 1000, now + 500).ok).toBe(false);
    expect(rateLimit("k", 1, 1000, now + 1500).ok).toBe(true);
  });

  it("tracks keys independently", () => {
    const now = 1_000_000;
    rateLimit("a", 1, 60_000, now);
    expect(rateLimit("a", 1, 60_000, now).ok).toBe(false);
    expect(rateLimit("b", 1, 60_000, now).ok).toBe(true);
  });
});
