import { describe, expect, it } from "vitest";
import {
  parseReportFailure,
  parseSuggestionFailure,
  reportFailureMessage,
} from "@/lib/messages";

describe("parseReportFailure", () => {
  it("extracts the reason raised by the database rules", () => {
    expect(parseReportFailure("parqo:too_far")).toBe("too_far");
    expect(parseReportFailure("something parqo:rate_limited_spot happened")).toBe(
      "rate_limited_spot",
    );
  });

  it("falls back to unknown", () => {
    expect(parseReportFailure(undefined)).toBe("unknown");
    expect(parseReportFailure("parqo:not_a_real_reason")).toBe("unknown");
    expect(parseReportFailure("permission denied")).toBe("unknown");
  });

  it("has a message for every reason", () => {
    expect(reportFailureMessage("too_far")).toMatch(/too far/i);
  });
});

describe("parseSuggestionFailure", () => {
  it("maps rate limits and constraint violations", () => {
    expect(parseSuggestionFailure("parqo:suggestion_limit", undefined)).toBe("rate_limited");
    expect(parseSuggestionFailure("check violated", "23514")).toBe("invalid");
    expect(parseSuggestionFailure("boom", "XX000")).toBe("unknown");
  });
});
