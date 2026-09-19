"use client";

import { useEffect, useRef } from "react";
import { Navigation, PanelRightClose, PanelRightOpen, TrainFront } from "lucide-react";
import type { Spot } from "@/data/spots";
import { distanceKm } from "@/lib/geo";
import { directionsLink } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/motion";
import SpotCard from "@/components/SpotCard";

export type ParkAndRide = {
  destinationName: string;
  metroName: string;
  distanceKm: number;
  lat: number;
  lng: number;
};

type Props = {
  open: boolean;
  onToggle: () => void;
  spots: Spot[];
  origin: [number, number];
  selectedId: string | null;
  highlightId: string | null;
  watchedIds: ReadonlySet<string>;
  onSelect: (id: string) => void;
  parkAndRide: ParkAndRide | null;
};

/** Right-hand list of spots. The toggle button always stays visible. */
export default function SpotsPanel({
  open,
  onToggle,
  spots,
  origin,
  selectedId,
  highlightId,
  watchedIds,
  onSelect,
  parkAndRide,
}: Props) {
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!open || !selectedId) return;
    cardRefs.current[selectedId]?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      inline: "nearest",
      block: "center",
    });
  }, [open, selectedId]);

  return (
    <aside
      aria-label="Nearby parking spots"
      className="pointer-events-none absolute bottom-3 right-3 z-10 flex max-h-[50vh] w-[66vw] max-w-xs flex-col items-end gap-2 sm:bottom-4 sm:right-4 sm:top-16 sm:max-h-none sm:w-80"
    >
      <button
        onClick={onToggle}
        className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-surface-2 bg-surface/95 text-foreground shadow-sm backdrop-blur transition hover:border-accent"
        aria-expanded={open}
        aria-label={open ? "Hide spots list" : "Show spots list"}
        title={open ? "Hide spots list" : "Show spots list"}
      >
        {open ? (
          <PanelRightClose className="h-4 w-4" aria-hidden="true" />
        ) : (
          <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="thin-scrollbar pointer-events-auto flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {spots.length === 0 && (
            <div className="rounded-xl border border-surface-2 bg-surface/95 p-4 text-xs text-muted shadow-sm backdrop-blur">
              No spots match these filters.
            </div>
          )}

          {parkAndRide && (
            <div className="w-full shrink-0 rounded-xl border border-accent bg-surface/95 p-4 text-left shadow-sm backdrop-blur">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-accent">
                <TrainFront className="h-3.5 w-3.5" aria-hidden="true" />
                Park &amp; Ride suggested
              </div>
              <h3 className="mb-0.5 text-sm font-semibold">{parkAndRide.metroName}</h3>
              <p className="mb-2 text-xs text-muted">
                Spots near {parkAndRide.destinationName} look full right now.{" "}
                {parkAndRide.distanceKm.toFixed(1)} km from your destination — park
                here and ride in.
              </p>
              <a
                href={directionsLink(parkAndRide.lat, parkAndRide.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-accent py-2 text-xs font-semibold text-black transition hover:brightness-90"
              >
                <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                Directions
              </a>
            </div>
          )}

          {spots.map((s) => (
            <SpotCard
              key={s.id}
              spot={s}
              distanceKm={distanceKm(origin, [s.lat, s.lng])}
              highlighted={s.id === highlightId}
              watched={watchedIds.has(s.id)}
              onSelect={() => onSelect(s.id)}
              buttonRef={(el) => {
                cardRefs.current[s.id] = el;
              }}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
