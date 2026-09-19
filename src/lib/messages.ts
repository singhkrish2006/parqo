export type ReportFailure =
  | "location_required"
  | "too_far"
  | "rate_limited_spot"
  | "rate_limited_device"
  | "device_required"
  | "invalid_status"
  | "unknown";

export type SuggestionFailure = "rate_limited" | "invalid" | "unknown";

const REPORT_MESSAGES: Record<ReportFailure, string> = {
  location_required: "Turn on location to report — reports only count from drivers near the spot.",
  too_far: "You're too far from this spot to report on it.",
  rate_limited_spot: "You just reported this spot — give it a couple of minutes.",
  rate_limited_device: "That's a lot of reports in a short time — try again later.",
  device_required: "Couldn't identify this device — reload the page and try again.",
  invalid_status: "That status can't be reported.",
  unknown: "Couldn't save that report — check your connection and try again.",
};

const SUGGESTION_MESSAGES: Record<SuggestionFailure, string> = {
  rate_limited: "You've suggested several spots today — please try again tomorrow.",
  invalid: "Some details didn't pass our checks — review the form and try again.",
  unknown: "Couldn't send your suggestion — check your connection and try again.",
};

export function reportFailureMessage(reason: ReportFailure): string {
  return REPORT_MESSAGES[reason];
}

export function suggestionFailureMessage(reason: SuggestionFailure): string {
  return SUGGESTION_MESSAGES[reason];
}

/** Server-side rules raise exceptions like "parqo:too_far" (see schema.sql). */
export function parseReportFailure(message: string | undefined): ReportFailure {
  const code = /parqo:([a-z_]+)/.exec(message ?? "")?.[1];
  return code && code in REPORT_MESSAGES ? (code as ReportFailure) : "unknown";
}

export function parseSuggestionFailure(
  message: string | undefined,
  pgCode: string | undefined,
): SuggestionFailure {
  if (message?.includes("parqo:suggestion_limit")) return "rate_limited";
  // 23514 = check_violation, 22xxx = data exceptions
  if (pgCode === "23514" || pgCode?.startsWith("22")) return "invalid";
  return "unknown";
}
