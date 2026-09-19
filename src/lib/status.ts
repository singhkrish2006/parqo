import type { SpotStatus } from "@/data/spots";

export const STATUS_COLOR: Record<SpotStatus, string> = {
  open: "#4ade80",
  limited: "#fbbf24",
  full: "#f87171",
  unknown: "#8a8a8a",
};

export const STATUS_LABEL: Record<SpotStatus, string> = {
  open: "Open",
  limited: "Limited",
  full: "Full",
  unknown: "Unknown",
};
