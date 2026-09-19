"use client";

import {
  Bell,
  Building2,
  Home,
  IndianRupee,
  Navigation,
  Route as RouteIcon,
  Search,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { CategoryFilter, SortMode } from "@/lib/spotFilters";

const CATEGORY_FILTERS: { key: CategoryFilter; label: string; icon: LucideIcon | null }[] = [
  { key: "all", label: "All spots", icon: null },
  { key: "public", label: "Public", icon: Building2 },
  { key: "private", label: "Private", icon: Home },
  { key: "charging", label: "EV charging", icon: Zap },
  { key: "open", label: "Open now", icon: null },
  { key: "watching", label: "Watching", icon: Bell },
];

const SORT_OPTIONS: { key: SortMode; label: string; icon: LucideIcon }[] = [
  { key: "nearest", label: "Nearest", icon: Navigation },
  { key: "cheapest", label: "Cheapest", icon: IndianRupee },
];

type Props = {
  isLive: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  routeLoading: boolean;
  destinationName: string | null;
  routeReady: boolean;
  onClearRoute: () => void;
  categoryFilter: CategoryFilter;
  onCategoryChange: (filter: CategoryFilter) => void;
  watchedCount: number;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  showSort: boolean;
  showLocationBanner: boolean;
  onDismissLocationBanner: () => void;
};

export default function TopBar(props: Props) {
  const {
    isLive,
    searchValue,
    onSearchChange,
    onSearchSubmit,
    routeLoading,
    destinationName,
    routeReady,
    onClearRoute,
    categoryFilter,
    onCategoryChange,
    watchedCount,
    sortMode,
    onSortChange,
    showSort,
    showLocationBanner,
    onDismissLocationBanner,
  } = props;

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2.5 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="pointer-events-auto rounded-full border border-surface-2 bg-surface/95 px-3.5 py-1.5 font-mono text-sm font-semibold tracking-tight shadow-sm backdrop-blur">
          Parqo<span className="text-accent">.</span>
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`pointer-events-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur ${
              isLive
                ? "border-accent/40 bg-surface/95 text-accent"
                : "border-surface-2 bg-surface/95 text-muted"
            }`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: isLive ? "#b6ff3a" : "#8a8a8a" }}
            />
            {isLive ? "Live" : "Demo data"}
          </span>
          <span className="pointer-events-auto rounded-full border border-surface-2 bg-surface/95 px-3 py-1.5 text-xs font-medium text-muted shadow-sm backdrop-blur">
            Delhi
          </span>
        </div>
      </div>

      <div className="pointer-events-auto relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearchSubmit();
          }}
          aria-label="Where are you headed? Shows parking spots along the way"
          className="w-full rounded-xl border border-surface-2 bg-surface/95 py-2.5 pl-10 pr-10 text-sm text-foreground shadow-sm backdrop-blur placeholder:text-muted focus:border-accent focus:outline-none sm:max-w-sm"
          placeholder="Where are you headed? (shows spots on the way)"
        />
        {destinationName ? (
          <button
            onClick={onClearRoute}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-foreground"
            aria-label="Clear route"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={onSearchSubmit}
            disabled={routeLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-accent disabled:opacity-50"
            aria-label="Get route"
          >
            <RouteIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {destinationName && (
        <div
          role="status"
          className="pointer-events-auto flex items-center gap-2 rounded-xl border border-accent/40 bg-surface/95 px-3 py-2 text-xs text-accent shadow-sm backdrop-blur"
        >
          <RouteIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {routeReady
            ? `Showing spots along the way to ${destinationName}`
            : `Routing to ${destinationName}...`}
        </div>
      )}

      <div
        role="group"
        aria-label="Filter spots"
        className="pointer-events-auto flex flex-wrap gap-2"
      >
        {CATEGORY_FILTERS.map((f) => {
          const Icon = f.icon;
          const active = categoryFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => onCategoryChange(f.key)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur transition ${
                active
                  ? "border-accent bg-accent text-black"
                  : "border-surface-2 bg-surface/95 text-muted hover:text-foreground"
              }`}
            >
              {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
              {f.label}
              {f.key === "watching" && watchedCount > 0 && (
                <span className="rounded-full bg-black/20 px-1.5 text-[10px]">
                  {watchedCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showSort && (
        <div
          role="group"
          aria-label="Sort spots"
          className="pointer-events-auto inline-flex w-fit items-center rounded-full border border-surface-2 bg-surface/95 p-1 text-xs font-medium shadow-sm backdrop-blur"
        >
          {SORT_OPTIONS.map((s) => {
            const Icon = s.icon;
            const active = sortMode === s.key;
            return (
              <button
                key={s.key}
                onClick={() => onSortChange(s.key)}
                aria-pressed={active}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${
                  active ? "bg-accent text-black" : "text-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {s.label}
              </button>
            );
          })}
        </div>
      )}

      {showLocationBanner && (
        <div
          role="status"
          className="pointer-events-auto flex items-start justify-between gap-3 rounded-xl border border-surface-2 bg-surface/95 px-4 py-2.5 text-xs text-muted shadow-sm backdrop-blur sm:max-w-sm"
        >
          <span>
            Couldn&apos;t get your location — showing Delhi spots from a
            default point.
          </span>
          <button
            onClick={onDismissLocationBanner}
            className="shrink-0 rounded-full p-0.5 text-muted transition hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </header>
  );
}
