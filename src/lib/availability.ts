import type { AvailabilityWindow } from "@/data/spots";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** null availability means "no owner-set restriction" — always available. */
export function isAvailableNow(availability: AvailabilityWindow, now = new Date()): boolean {
  if (!availability) return true;
  if (!availability.days.includes(now.getDay())) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= toMinutes(availability.start) && minutes < toMinutes(availability.end);
}

export function describeAvailability(availability: AvailabilityWindow): string {
  if (!availability) return "Available anytime";
  const days = availability.days;
  const isEveryDay = days.length === 7;
  const isWeekdays =
    days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d));
  const dayLabel = isEveryDay
    ? "Every day"
    : isWeekdays
      ? "Weekdays"
      : days
          .slice()
          .sort()
          .map((d) => DAY_NAMES[d])
          .join(", ");
  return `${dayLabel}, ${formatHour(availability.start)}–${formatHour(availability.end)}`;
}

function formatHour(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "am" : "pm";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}${period}` : `${hour12}:${String(m).padStart(2, "0")}${period}`;
}
