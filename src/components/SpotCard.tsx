"use client";

import { Bell, Building2, Clock, Home, ShieldCheck, Zap } from "lucide-react";
import type { Spot } from "@/data/spots";
import { describeAvailability, isAvailableNow } from "@/lib/availability";
import { priceLabel } from "@/lib/format";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/status";

type Props = {
  spot: Spot;
  distanceKm: number;
  highlighted: boolean;
  watched: boolean;
  onSelect: () => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
};

export default function SpotCard({
  spot: s,
  distanceKm,
  highlighted,
  watched,
  onSelect,
  buttonRef,
}: Props) {
  return (
    <button
      ref={buttonRef}
      onClick={onSelect}
      className={`w-full shrink-0 rounded-xl border bg-surface/95 p-4 text-left shadow-sm backdrop-blur transition ${
        highlighted ? "border-accent" : "border-surface-2"
      }`}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: STATUS_COLOR[s.status] }}
        />
        <span className="text-xs text-muted">{STATUS_LABEL[s.status]}</span>
        <span className="flex items-center gap-1 rounded-full border border-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">
          {s.ownership === "public" ? (
            <Building2 className="h-2.5 w-2.5" aria-hidden="true" />
          ) : (
            <Home className="h-2.5 w-2.5" aria-hidden="true" />
          )}
          {s.ownership === "public" ? "Public" : "Private"}
        </span>
        {s.verified && (
          <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
            <ShieldCheck className="h-2.5 w-2.5" aria-hidden="true" />
            Verified
          </span>
        )}
        {watched && <Bell className="h-3 w-3 text-accent" aria-label="Watching" />}
        <span className="ml-auto text-xs font-semibold text-foreground">
          {distanceKm.toFixed(1)} km
        </span>
      </div>
      <h3 className="mb-0.5 truncate text-sm font-semibold">{s.name}</h3>
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <span className="truncate">{s.type}</span>
        <span aria-hidden="true">·</span>
        <span className="font-medium text-foreground">{priceLabel(s.pricePerHour)}</span>
        {s.charging && (
          <span className="flex items-center gap-0.5 rounded-full border border-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted">
            <Zap className="h-2.5 w-2.5" aria-hidden="true" />
            EV
          </span>
        )}
      </div>
      {s.ownership === "private" && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {describeAvailability(s.availability)}
          <span
            className="ml-0.5 h-1.5 w-1.5 rounded-full"
            style={{
              background: isAvailableNow(s.availability) ? "#b6ff3a" : "#8a8a8a",
            }}
          />
        </div>
      )}
    </button>
  );
}
