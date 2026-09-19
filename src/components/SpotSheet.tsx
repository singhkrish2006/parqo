"use client";

import { useId } from "react";
import {
  Bell,
  BellOff,
  Building2,
  Clock,
  Home,
  IndianRupee,
  Navigation,
  ShieldCheck,
  TrainFront,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import type { Spot, SpotStatus } from "@/data/spots";
import type { MetroParking } from "@/data/metroParkings";
import { describeAvailability, isAvailableNow } from "@/lib/availability";
import { directionsLink, priceLabel } from "@/lib/format";
import { distanceKm } from "@/lib/geo";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/status";
import { buildUpiPayLink, isUpiDemoEnabled } from "@/lib/upi";
import { useDialog } from "@/hooks/useDialog";

type Props = {
  spot: Spot;
  origin: [number, number];
  watched: boolean;
  agreement: number;
  metroSuggestion: { metro: MetroParking; distance: number } | null;
  reporting: boolean;
  onClose: () => void;
  onToggleWatch: () => void;
  onReport: (status: SpotStatus) => void;
};

export default function SpotSheet({
  spot,
  origin,
  watched,
  agreement,
  metroSuggestion,
  reporting,
  onClose,
  onToggleWatch,
  onReport,
}: Props) {
  const titleId = useId();
  const dialogRef = useDialog(onClose);

  return (
    <div
      className="absolute inset-0 z-30 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-surface-2 bg-surface p-5 outline-none"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-sm font-semibold">
            {spot.name}
          </h2>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={onToggleWatch}
              aria-pressed={watched}
              className={`rounded-full p-1 transition hover:bg-surface-2 ${
                watched ? "text-accent" : "text-muted hover:text-foreground"
              }`}
              aria-label={watched ? "Stop watching" : "Watch for when it opens"}
            >
              {watched ? (
                <Bell className="h-4 w-4" aria-hidden="true" />
              ) : (
                <BellOff className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-muted transition hover:bg-surface-2 hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: STATUS_COLOR[spot.status] }}
          />
          <span className="text-xs text-muted">
            {STATUS_LABEL[spot.status]} · reported by drivers
          </span>
          <span className="flex items-center gap-1 rounded-full border border-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">
            {spot.ownership === "public" ? (
              <Building2 className="h-2.5 w-2.5" aria-hidden="true" />
            ) : (
              <Home className="h-2.5 w-2.5" aria-hidden="true" />
            )}
            {spot.ownership === "public" ? "Public parking" : "Privately owned"}
          </span>
          {spot.verified && (
            <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
              <ShieldCheck className="h-2.5 w-2.5" aria-hidden="true" />
              Verified
            </span>
          )}
        </div>

        {agreement >= 2 && (
          <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-xs text-accent">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Confirmed by {agreement} drivers in the last 30 min
          </div>
        )}

        <div className="mb-1 grid grid-cols-3 gap-2 rounded-xl border border-surface-2 bg-surface-2 p-3 text-center text-xs">
          <div className="flex flex-col items-center gap-1">
            <IndianRupee className="h-4 w-4 text-accent" aria-hidden="true" />
            <div className="font-semibold text-foreground">
              {priceLabel(spot.pricePerHour)}
            </div>
            <div className="text-muted">Price</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Zap className="h-4 w-4 text-accent" aria-hidden="true" />
            <div className="font-semibold text-foreground">
              {spot.charging ? "Yes" : "No"}
            </div>
            <div className="text-muted">EV charging</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Navigation className="h-4 w-4 text-accent" aria-hidden="true" />
            <div className="font-semibold text-foreground">
              {distanceKm(origin, [spot.lat, spot.lng]).toFixed(1)} km
            </div>
            <div className="text-muted">Away</div>
          </div>
        </div>
        <p className="mb-1 px-1 text-[11px] text-muted">{spot.priceNote}</p>
        {spot.charging && spot.connectorType && (
          <p className="mb-3 px-1 text-[11px] text-muted">
            Connector: {spot.connectorType}
            {spot.chargingSpeedKw ? ` · ${spot.chargingSpeedKw} kW` : ""}
          </p>
        )}
        {spot.ownership === "private" && (
          <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-surface-2 px-3 py-2 text-xs">
            <Clock className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
            <span className="text-muted">{describeAvailability(spot.availability)}</span>
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
                isAvailableNow(spot.availability)
                  ? "bg-accent/15 text-accent"
                  : "bg-surface-2 text-muted"
              }`}
            >
              {isAvailableNow(spot.availability) ? "Available now" : "Not available now"}
            </span>
          </div>
        )}

        {spot.status === "full" && metroSuggestion && (
          <div className="mb-4 rounded-xl border border-surface-2 bg-surface-2 p-3 text-xs">
            <p className="mb-2 flex items-center gap-1.5 text-muted">
              <TrainFront className="h-3.5 w-3.5" aria-hidden="true" />
              This spot is full. Nearest metro parking to it:
            </p>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium">{metroSuggestion.metro.name}</span>
              <span className="text-muted">
                {priceLabel(metroSuggestion.metro.pricePerHour)} ·{" "}
                {metroSuggestion.distance.toFixed(1)} km from spot
              </span>
            </div>
            <p className="mb-2 text-[11px] text-muted">{metroSuggestion.metro.priceNote}</p>
            <a
              href={directionsLink(metroSuggestion.metro.lat, metroSuggestion.metro.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-surface-2 py-2 text-center font-medium transition hover:border-accent"
            >
              <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
              Directions to metro parking
            </a>
          </div>
        )}

        <p className="mb-2 text-xs text-muted">Report current status</p>
        <div className="mb-3 grid grid-cols-3 gap-2" aria-busy={reporting}>
          {(["open", "limited", "full"] as SpotStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => onReport(s)}
              disabled={reporting}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-surface-2 bg-surface-2 py-3 text-xs font-medium transition hover:border-accent disabled:opacity-50"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: STATUS_COLOR[s] }}
              />
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <a
          href={directionsLink(spot.lat, spot.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-center text-sm font-semibold text-black transition hover:brightness-90"
        >
          <Navigation className="h-4 w-4" aria-hidden="true" />
          Get Directions
        </a>

        {isUpiDemoEnabled && spot.ownership === "public" && spot.pricePerHour > 0 && (
          <>
            <a
              href={buildUpiPayLink({
                amount: spot.pricePerHour,
                note: `Parqo parking - ${spot.name}`,
              })}
              className="flex items-center justify-center gap-2 rounded-xl border border-surface-2 py-3 text-center text-sm font-medium transition hover:border-accent"
            >
              <Wallet className="h-4 w-4" aria-hidden="true" />
              Pay {priceLabel(spot.pricePerHour)} via UPI (Demo)
            </a>
            <p className="mt-1.5 px-1 text-center text-[10px] text-muted">
              Demo link only — no real payment provider connected yet.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
