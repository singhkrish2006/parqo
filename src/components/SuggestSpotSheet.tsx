"use client";

import { useId, useState } from "react";
import { Crosshair, MapPin, X } from "lucide-react";
import type { Ownership } from "@/data/spots";
import { useDialog } from "@/hooks/useDialog";
import { getCurrentLatLng } from "@/lib/geolocation";
import {
  CONNECTOR_TYPES,
  PRIVATE_TYPES,
  PUBLIC_TYPES,
  defaultPriceNote,
  validateSuggestion,
  type SpotSuggestionInput,
} from "@/lib/suggestions";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const inputClass =
  "w-full rounded-lg border border-surface-2 bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-muted";

type Props = {
  /** True while the user is choosing a location on the map. */
  hidden: boolean;
  location: { lat: number; lng: number } | null;
  onPickOnMap: () => void;
  onLocationChange: (location: { lat: number; lng: number }) => void;
  onClose: () => void;
  /** Resolves to an error message, or null when the suggestion was accepted. */
  onSubmit: (input: SpotSuggestionInput) => Promise<string | null>;
};

export default function SuggestSpotSheet({
  hidden,
  location,
  onPickOnMap,
  onLocationChange,
  onClose,
  onSubmit,
}: Props) {
  const titleId = useId();
  const dialogRef = useDialog<HTMLFormElement>(onClose, !hidden);

  const [name, setName] = useState("");
  const [ownership, setOwnership] = useState<Ownership>("public");
  const [type, setType] = useState<string>(PUBLIC_TYPES[0]);
  const [priceText, setPriceText] = useState("20");
  const [priceNote, setPriceNote] = useState("");
  const [charging, setCharging] = useState(false);
  const [connectorType, setConnectorType] = useState<string>(CONNECTOR_TYPES[0]);
  const [speedText, setSpeedText] = useState("");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  const types = ownership === "private" ? PRIVATE_TYPES : PUBLIC_TYPES;

  function changeOwnership(next: Ownership) {
    setOwnership(next);
    setType((next === "private" ? PRIVATE_TYPES : PUBLIC_TYPES)[0]);
  }

  function toggleDay(day: number) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  async function useMyLocation() {
    setLocating(true);
    const position = await getCurrentLatLng();
    setLocating(false);
    if (!position) {
      setError("Couldn't get your location — pick the spot on the map instead.");
      return;
    }
    setError(null);
    onLocationChange({ lat: position[0], lng: position[1] });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const price = priceText.trim() === "" ? Number.NaN : Number(priceText);
    const speed = speedText.trim() === "" ? null : Number(speedText);
    const input: SpotSuggestionInput = {
      name,
      ownership,
      type,
      lat: location?.lat ?? Number.NaN,
      lng: location?.lng ?? Number.NaN,
      pricePerHour: price,
      priceNote: priceNote.trim() || defaultPriceNote(ownership, price),
      charging,
      connectorType: charging ? connectorType : null,
      chargingSpeedKw: charging ? speed : null,
      availability: ownership === "private" ? { days, start, end } : null,
    };

    const problem = validateSuggestion(input);
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setSubmitting(true);
    const failure = await onSubmit(input);
    setSubmitting(false);
    if (failure) setError(failure);
  }

  return (
    <div
      className={`absolute inset-0 z-30 flex items-end justify-center bg-black/60 ${
        hidden ? "hidden" : ""
      }`}
      onClick={onClose}
    >
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-surface-2 bg-surface p-5 outline-none"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-sm font-semibold">
              Suggest a parking spot
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Suggestions are reviewed before they appear on the map.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted transition hover:bg-surface-2 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mb-3">
          <label htmlFor={`${titleId}-name`} className={labelClass}>
            Name
          </label>
          <input
            id={`${titleId}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="e.g. Lajpat Nagar — Central Market"
            className={inputClass}
            required
          />
        </div>

        <fieldset className="mb-3">
          <legend className={labelClass}>Who runs it?</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["public", "private"] as Ownership[]).map((o) => (
              <button
                type="button"
                key={o}
                onClick={() => changeOwnership(o)}
                aria-pressed={ownership === o}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  ownership === o
                    ? "border-accent bg-accent text-black"
                    : "border-surface-2 bg-surface-2 text-muted hover:text-foreground"
                }`}
              >
                {o === "public" ? "Public lot / street" : "Private owner"}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={`${titleId}-type`} className={labelClass}>
              Type
            </label>
            <select
              id={`${titleId}-type`}
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={inputClass}
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${titleId}-price`} className={labelClass}>
              Price per hour (₹)
            </label>
            <input
              id={`${titleId}-price`}
              type="number"
              inputMode="numeric"
              min={0}
              max={500}
              step={1}
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              className={inputClass}
              required
            />
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor={`${titleId}-note`} className={labelClass}>
            Pricing details (optional)
          </label>
          <input
            id={`${titleId}-note`}
            value={priceNote}
            onChange={(e) => setPriceNote(e.target.value)}
            maxLength={160}
            placeholder="e.g. ₹20/hr, ₹100 max per day"
            className={inputClass}
          />
        </div>

        <div className="mb-3">
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={charging}
              onChange={(e) => setCharging(e.target.checked)}
              className="h-4 w-4 accent-[#b6ff3a]"
            />
            Has EV charging
          </label>
          {charging && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label htmlFor={`${titleId}-connector`} className={labelClass}>
                  Connector
                </label>
                <select
                  id={`${titleId}-connector`}
                  value={connectorType}
                  onChange={(e) => setConnectorType(e.target.value)}
                  className={inputClass}
                >
                  {CONNECTOR_TYPES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${titleId}-kw`} className={labelClass}>
                  Speed in kW (optional)
                </label>
                <input
                  id={`${titleId}-kw`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={350}
                  step="any"
                  value={speedText}
                  onChange={(e) => setSpeedText(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>

        {ownership === "private" && (
          <fieldset className="mb-3">
            <legend className={labelClass}>When can it be rented?</legend>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, day) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => toggleDay(day)}
                  aria-pressed={days.includes(day)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    days.includes(day)
                      ? "border-accent bg-accent text-black"
                      : "border-surface-2 bg-surface-2 text-muted hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor={`${titleId}-start`} className={labelClass}>
                  From
                </label>
                <input
                  id={`${titleId}-start`}
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor={`${titleId}-end`} className={labelClass}>
                  Until
                </label>
                <input
                  id={`${titleId}-end`}
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>
        )}

        <div className="mb-4">
          <span className={labelClass}>Location</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onPickOnMap}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-surface-2 bg-surface-2 px-3 py-2 text-xs font-medium transition hover:border-accent"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Pick on map
            </button>
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-surface-2 bg-surface-2 px-3 py-2 text-xs font-medium transition hover:border-accent disabled:opacity-50"
            >
              <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
              {locating ? "Locating..." : "Use my location"}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted" aria-live="polite">
            {location
              ? `Selected: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
              : "No location selected yet."}
          </p>
        </div>

        {error && (
          <p role="alert" className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-black transition hover:brightness-90 disabled:opacity-50"
        >
          {submitting ? "Sending..." : "Send for review"}
        </button>
        <p className="mt-2 text-center text-[10px] text-muted">
          We store an anonymous device id with suggestions to limit spam.{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Privacy
          </a>
        </p>
      </form>
    </div>
  );
}
