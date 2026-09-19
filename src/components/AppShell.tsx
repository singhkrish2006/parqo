"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Building2,
  Clock,
  Home,
  IndianRupee,
  Navigation,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  TrainFront,
  Users,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  DELHI_CENTER,
  spots as seedSpots,
  type Spot,
  type SpotStatus,
} from "@/data/spots";
import { nearestMetroParking } from "@/data/metroParkings";
import { distanceKm, distanceToPolylineKm } from "@/lib/geo";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/status";
import {
  fetchSpots,
  getRecentAgreement,
  subscribeToSpotUpdates,
  submitReport,
} from "@/lib/spotsRepo";
import { getWatchlist, toggleWatch } from "@/lib/watchlist";
import { describeAvailability, isAvailableNow } from "@/lib/availability";
import { geocode, fetchDrivingRoute, type LatLng } from "@/lib/routing";
import { buildUpiPayLink } from "@/lib/upi";

const ParqoMap = dynamic(() => import("@/components/ParqoMap"), {
  ssr: false,
});

type CategoryFilter = "all" | "public" | "private" | "charging" | "open" | "watching";
type SortMode = "nearest" | "cheapest";

const CATEGORY_FILTERS: { key: CategoryFilter; label: string; icon: LucideIcon | null }[] = [
  { key: "all", label: "All spots", icon: null },
  { key: "public", label: "Public", icon: Building2 },
  { key: "private", label: "Private", icon: Home },
  { key: "charging", label: "EV charging", icon: Zap },
  { key: "open", label: "Open now", icon: null },
  { key: "watching", label: "Watching", icon: Bell },
];

function priceLabel(pricePerHour: number) {
  return pricePerHour === 0 ? "Free" : `₹${pricePerHour}/hr`;
}

function directionsLink(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export default function AppShell() {
  const [spots, setSpots] = useState<Spot[]>(seedSpots);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("nearest");
  const [isLive, setIsLive] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [agreement, setAgreement] = useState(0);

  // Route-integrated parking
  const [searchValue, setSearchValue] = useState("");
  const [destination, setDestination] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [routePath, setRoutePath] = useState<LatLng[] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const watchedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    watchedIdsRef.current = watchedIds;
  }, [watchedIds]);

  function notifyWatchedSpotOpen(name: string) {
    setToast(`${name} just opened up — you're watching it`);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Parqo", { body: `${name} just opened up` });
    }
  }

  useEffect(() => {
    // localStorage doesn't exist during SSR, so the watchlist can only be
    // read client-side, post-mount — loading it here (rather than in a
    // lazy useState initializer) keeps the first client render identical
    // to the server's and avoids a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWatchedIds(getWatchlist());
  }, []);

  useEffect(() => {
    fetchSpots().then(({ spots, live }) => {
      setSpots(spots);
      setIsLive(live);
    });
  }, []);

  useEffect(() => {
    return subscribeToSpotUpdates((updated) => {
      setSpots((prev) => {
        const previous = prev.find((s) => s.id === updated.id);
        if (
          previous &&
          previous.status !== "open" &&
          updated.status === "open" &&
          watchedIdsRef.current.has(updated.id)
        ) {
          notifyWatchedSpotOpen(updated.name);
        }
        return prev.map((s) => (s.id === updated.id ? updated : s));
      });
    });
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocationDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => setLocationDenied(true),
      { timeout: 6000 },
    );
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!selectedId) return;
    cardRefs.current[selectedId]?.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
      block: "center",
    });
  }, [selectedId]);

  const origin = userPos ?? DELHI_CENTER;

  const sortedSpots = useMemo(() => {
    const filtered = spots.filter((s) => {
      if (categoryFilter === "public") return s.ownership === "public";
      if (categoryFilter === "private") return s.ownership === "private";
      if (categoryFilter === "charging") return s.charging;
      if (categoryFilter === "open") return s.status === "open";
      if (categoryFilter === "watching") return watchedIds.has(s.id);
      return true;
    });

    if (routePath && routePath.length > 1) {
      return filtered
        .map((s) => ({ spot: s, d: distanceToPolylineKm([s.lat, s.lng], routePath) }))
        .filter((x) => x.d <= 1.2)
        .sort((a, b) => a.d - b.d)
        .map((x) => x.spot);
    }

    return filtered.sort((a, b) => {
      if (sortMode === "cheapest" && a.pricePerHour !== b.pricePerHour) {
        return a.pricePerHour - b.pricePerHour;
      }
      return (
        distanceKm(origin, [a.lat, a.lng]) - distanceKm(origin, [b.lat, b.lng])
      );
    });
  }, [spots, origin, categoryFilter, sortMode, routePath, watchedIds]);

  // Only reflects an explicit click (marker or card) — never auto-selected,
  // so the map doesn't fly anywhere on load.
  const activeSpot = spots.find((s) => s.id === selectedId) ?? null;
  const highlightId = selectedId ?? sortedSpots[0]?.id ?? null;
  const sheetTarget = activeSpot ?? sortedSpots[0] ?? null;

  const metroSuggestion = useMemo(() => {
    if (!sheetTarget) return null;
    return nearestMetroParking([sheetTarget.lat, sheetTarget.lng]);
  }, [sheetTarget]);

  const metroForDestination = useMemo(() => {
    if (!destination) return null;
    return nearestMetroParking([destination.lat, destination.lng]);
  }, [destination]);

  const destinationLooksFull = useMemo(() => {
    if (!destination) return false;
    const nearby = spots.filter(
      (s) => distanceKm([destination.lat, destination.lng], [s.lat, s.lng]) <= 1.2,
    );
    return nearby.length > 0 && nearby.every((s) => s.status !== "open");
  }, [destination, spots]);

  useEffect(() => {
    if (!sheetTarget || !isLive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAgreement(0);
      return;
    }
    let cancelled = false;
    getRecentAgreement(sheetTarget.id, sheetTarget.status).then((n) => {
      if (!cancelled) setAgreement(n);
    });
    return () => {
      cancelled = true;
    };
    // Deliberately depends on the id/status fields (not the sheetTarget
    // object itself, which is re-created every render) so this only
    // re-runs when the selected spot or its status actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetTarget?.id, sheetTarget?.status, isLive]);

  function selectSpot(id: string) {
    setSelectedId(id);
    setSheetOpen(true);
  }

  function toggleWatchSpot(id: string) {
    const updated = toggleWatch(id);
    setWatchedIds(new Set(updated));
    if (
      updated.has(id) &&
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }

  async function reportStatus(status: SpotStatus) {
    if (!sheetTarget) return;
    const id = sheetTarget.id;
    setSpots((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    if (isLive) {
      const { ok } = await submitReport(id, status);
      setToast(
        ok
          ? "Reported — visible to every driver on Parqo now"
          : "Couldn't save that report — check your connection",
      );
    } else {
      setToast("Reported (demo mode — connect a database to make this live)");
    }
  }

  async function handleSearch() {
    const query = searchValue.trim();
    if (!query) return;
    setRouteLoading(true);
    const dest = await geocode(`${query}, Delhi, India`);
    if (!dest) {
      setToast("Couldn't find that place — try a different search");
      setRouteLoading(false);
      return;
    }
    const path = await fetchDrivingRoute(origin, dest);
    setDestination({ name: query, lat: dest[0], lng: dest[1] });
    setRoutePath(path);
    setRouteLoading(false);
    if (!path) setToast("Found the place but couldn't fetch a route right now");
  }

  function clearRoute() {
    setSearchValue("");
    setDestination(null);
    setRoutePath(null);
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <div className="absolute inset-0 z-0 isolate">
        <ParqoMap
          spots={sortedSpots}
          selectedId={selectedId}
          onSelectSpot={selectSpot}
          routePath={routePath}
          destination={destination}
        />
      </div>

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2.5 p-3 sm:p-4">
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
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            className="w-full rounded-xl border border-surface-2 bg-surface/95 py-2.5 pl-10 pr-10 text-sm text-foreground shadow-sm placeholder:text-muted backdrop-blur focus:border-accent focus:outline-none sm:max-w-sm"
            placeholder="Where are you headed? (shows spots on the way)"
          />
          {destination ? (
            <button
              onClick={clearRoute}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-foreground"
              aria-label="Clear route"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSearch}
              disabled={routeLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-accent disabled:opacity-50"
              aria-label="Get route"
            >
              <RouteIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {destination && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-accent/40 bg-surface/95 px-3 py-2 text-xs text-accent shadow-sm backdrop-blur">
            <RouteIcon className="h-3.5 w-3.5 shrink-0" />
            {routePath
              ? `Showing spots along the way to ${destination.name}`
              : `Routing to ${destination.name}...`}
          </div>
        )}

        <div className="pointer-events-auto flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((f) => {
            const Icon = f.icon;
            const active = categoryFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setCategoryFilter(f.key)}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur transition ${
                  active
                    ? "border-accent bg-accent text-black"
                    : "border-surface-2 bg-surface/95 text-muted hover:border-surface-2 hover:text-foreground"
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {f.label}
                {f.key === "watching" && watchedIds.size > 0 && (
                  <span className="rounded-full bg-black/20 px-1.5 text-[10px]">
                    {watchedIds.size}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {!routePath && (
          <div className="pointer-events-auto inline-flex w-fit items-center rounded-full border border-surface-2 bg-surface/95 p-1 text-xs font-medium shadow-sm backdrop-blur">
            {(
              [
                { key: "nearest" as const, label: "Nearest", icon: Navigation },
                { key: "cheapest" as const, label: "Cheapest", icon: IndianRupee },
              ]
            ).map((s) => {
              const Icon = s.icon;
              const active = sortMode === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setSortMode(s.key)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${
                    active ? "bg-accent text-black" : "text-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
              );
            })}
          </div>
        )}

        {locationDenied && !bannerDismissed && (
          <div className="pointer-events-auto flex items-start justify-between gap-3 rounded-xl border border-surface-2 bg-surface/95 px-4 py-2.5 text-xs text-muted shadow-sm backdrop-blur sm:max-w-sm">
            <span>
              Couldn&apos;t get your location — showing Delhi spots from a
              default point.
            </span>
            <button
              onClick={() => setBannerDismissed(true)}
              className="shrink-0 rounded-full p-0.5 text-muted transition hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-col gap-1.5 rounded-xl border border-surface-2 bg-surface/95 px-3 py-2 text-xs text-muted shadow-sm backdrop-blur sm:flex-row sm:gap-3 sm:rounded-full sm:py-1.5">
        {(["open", "limited", "full"] as SpotStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: STATUS_COLOR[s] }}
            />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      {/* Floating: open details for the top-ranked spot */}
      <button
        onClick={() => sheetTarget && selectSpot(sheetTarget.id)}
        className="absolute bottom-24 left-3 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-black shadow-lg transition hover:brightness-90 sm:bottom-16"
        aria-label="View top spot"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {/* Spots panel (right side): toggle button always visible, list can be hidden */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex max-h-[50vh] w-[66vw] max-w-xs flex-col items-end gap-2 sm:bottom-4 sm:right-4 sm:top-16 sm:max-h-none sm:w-80">
        <button
          onClick={() => setPanelOpen((open) => !open)}
          className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-surface-2 bg-surface/95 text-foreground shadow-sm backdrop-blur transition hover:border-accent"
          aria-expanded={panelOpen}
          aria-label={panelOpen ? "Hide spots list" : "Show spots list"}
          title={panelOpen ? "Hide spots list" : "Show spots list"}
        >
          {panelOpen ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRightOpen className="h-4 w-4" />
          )}
        </button>

        {panelOpen && (
          <div className="thin-scrollbar pointer-events-auto flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {sortedSpots.length === 0 && (
          <div className="rounded-xl border border-surface-2 bg-surface/95 p-4 text-xs text-muted shadow-sm backdrop-blur">
            No spots match these filters.
          </div>
        )}
        {destination && destinationLooksFull && metroForDestination && (
          <div className="w-full shrink-0 rounded-xl border border-accent bg-surface/95 p-4 text-left shadow-sm backdrop-blur">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-accent">
              <TrainFront className="h-3.5 w-3.5" />
              Park & Ride suggested
            </div>
            <h3 className="mb-0.5 text-sm font-semibold">
              {metroForDestination.metro.name}
            </h3>
            <p className="mb-2 text-xs text-muted">
              Spots near {destination.name} look full right now.{" "}
              {metroForDestination.distance.toFixed(1)} km from your
              destination — park here and ride in.
            </p>
            <a
              href={directionsLink(metroForDestination.metro.lat, metroForDestination.metro.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-lg bg-accent py-2 text-xs font-semibold text-black transition hover:brightness-90"
            >
              <Navigation className="h-3.5 w-3.5" />
              Directions
            </a>
          </div>
        )}

        {sortedSpots.map((s) => (
          <button
            key={s.id}
            ref={(el) => {
              cardRefs.current[s.id] = el;
            }}
            onClick={() => selectSpot(s.id)}
            className={`w-full shrink-0 rounded-xl border bg-surface/95 p-4 text-left shadow-sm backdrop-blur transition ${
              s.id === highlightId ? "border-accent" : "border-surface-2"
            }`}
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: STATUS_COLOR[s.status] }}
              />
              <span className="text-xs text-muted">
                {STATUS_LABEL[s.status]}
              </span>
              <span className="flex items-center gap-1 rounded-full border border-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">
                {s.ownership === "public" ? (
                  <Building2 className="h-2.5 w-2.5" />
                ) : (
                  <Home className="h-2.5 w-2.5" />
                )}
                {s.ownership === "public" ? "Public" : "Private"}
              </span>
              {s.verified && (
                <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  Verified
                </span>
              )}
              {watchedIds.has(s.id) && (
                <Bell className="h-3 w-3 text-accent" />
              )}
              <span className="ml-auto text-xs font-semibold text-foreground">
                {distanceKm(origin, [s.lat, s.lng]).toFixed(1)} km
              </span>
            </div>
            <h3 className="mb-0.5 truncate text-sm font-semibold">
              {s.name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span className="truncate">{s.type}</span>
              <span>·</span>
              <span className="font-medium text-foreground">
                {priceLabel(s.pricePerHour)}
              </span>
              {s.charging && (
                <span className="flex items-center gap-0.5 rounded-full border border-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted">
                  <Zap className="h-2.5 w-2.5" />
                  EV
                </span>
              )}
            </div>
            {s.ownership === "private" && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                <Clock className="h-3 w-3" />
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
        ))}
          </div>
        )}
      </div>

      {/* Spot detail sheet */}
      {sheetOpen && sheetTarget && (
        <div
          className="absolute inset-0 z-30 flex items-end justify-center bg-black/60"
          onClick={() => setSheetOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-surface-2 bg-surface p-5"
          >
            <div className="mb-1 flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold">{sheetTarget.name}</h3>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => toggleWatchSpot(sheetTarget.id)}
                  className={`rounded-full p-1 transition hover:bg-surface-2 ${
                    watchedIds.has(sheetTarget.id) ? "text-accent" : "text-muted hover:text-foreground"
                  }`}
                  aria-label={watchedIds.has(sheetTarget.id) ? "Stop watching" : "Watch for when it opens"}
                >
                  {watchedIds.has(sheetTarget.id) ? (
                    <Bell className="h-4 w-4" />
                  ) : (
                    <BellOff className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="rounded-full p-1 text-muted transition hover:bg-surface-2 hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: STATUS_COLOR[sheetTarget.status] }}
              />
              <span className="text-xs text-muted">
                {STATUS_LABEL[sheetTarget.status]} · reported by drivers
              </span>
              <span className="flex items-center gap-1 rounded-full border border-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">
                {sheetTarget.ownership === "public" ? (
                  <Building2 className="h-2.5 w-2.5" />
                ) : (
                  <Home className="h-2.5 w-2.5" />
                )}
                {sheetTarget.ownership === "public"
                  ? "Public parking"
                  : "Privately owned"}
              </span>
              {sheetTarget.verified && (
                <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  Verified
                </span>
              )}
            </div>

            {agreement >= 2 && (
              <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-xs text-accent">
                <Users className="h-3.5 w-3.5" />
                Confirmed by {agreement} drivers in the last 30 min
              </div>
            )}

            <div className="mb-1 grid grid-cols-3 gap-2 rounded-xl border border-surface-2 bg-surface-2 p-3 text-center text-xs">
              <div className="flex flex-col items-center gap-1">
                <IndianRupee className="h-4 w-4 text-accent" />
                <div className="font-semibold text-foreground">
                  {priceLabel(sheetTarget.pricePerHour)}
                </div>
                <div className="text-muted">Price</div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Zap className="h-4 w-4 text-accent" />
                <div className="font-semibold text-foreground">
                  {sheetTarget.charging ? "Yes" : "No"}
                </div>
                <div className="text-muted">EV charging</div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Navigation className="h-4 w-4 text-accent" />
                <div className="font-semibold text-foreground">
                  {distanceKm(origin, [sheetTarget.lat, sheetTarget.lng]).toFixed(1)}{" "}
                  km
                </div>
                <div className="text-muted">Away</div>
              </div>
            </div>
            <p className="mb-1 px-1 text-[11px] text-muted">
              {sheetTarget.priceNote}
            </p>
            {sheetTarget.charging && sheetTarget.connectorType && (
              <p className="mb-3 px-1 text-[11px] text-muted">
                Connector: {sheetTarget.connectorType}
                {sheetTarget.chargingSpeedKw ? ` · ${sheetTarget.chargingSpeedKw} kW` : ""}
              </p>
            )}
            {sheetTarget.ownership === "private" && (
              <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-surface-2 px-3 py-2 text-xs">
                <Clock className="h-3.5 w-3.5 text-muted" />
                <span className="text-muted">
                  {describeAvailability(sheetTarget.availability)}
                </span>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    isAvailableNow(sheetTarget.availability)
                      ? "bg-accent/15 text-accent"
                      : "bg-surface-2 text-muted"
                  }`}
                >
                  {isAvailableNow(sheetTarget.availability) ? "Available now" : "Not available now"}
                </span>
              </div>
            )}

            {sheetTarget.status === "full" && metroSuggestion && (
              <div className="mb-4 rounded-xl border border-surface-2 bg-surface-2 p-3 text-xs">
                <p className="mb-2 flex items-center gap-1.5 text-muted">
                  <TrainFront className="h-3.5 w-3.5" />
                  This spot is full. Nearest metro parking to it:
                </p>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium">
                    {metroSuggestion.metro.name}
                  </span>
                  <span className="text-muted">
                    {priceLabel(metroSuggestion.metro.pricePerHour)} ·{" "}
                    {metroSuggestion.distance.toFixed(1)} km from spot
                  </span>
                </div>
                <p className="mb-2 text-[11px] text-muted">
                  {metroSuggestion.metro.priceNote}
                </p>
                <a
                  href={directionsLink(metroSuggestion.metro.lat, metroSuggestion.metro.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-surface-2 py-2 text-center font-medium transition hover:border-accent"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  Directions to metro parking
                </a>
              </div>
            )}

            <p className="mb-2 text-xs text-muted">Report current status</p>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {(["open", "limited", "full"] as SpotStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => reportStatus(s)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-surface-2 bg-surface-2 py-3 text-xs font-medium transition hover:border-accent"
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
              href={directionsLink(sheetTarget.lat, sheetTarget.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-2 flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-center text-sm font-semibold text-black transition hover:brightness-90"
            >
              <Navigation className="h-4 w-4" />
              Get Directions
            </a>

            {sheetTarget.ownership === "public" && sheetTarget.pricePerHour > 0 && (
              <>
                <a
                  href={buildUpiPayLink({
                    amount: sheetTarget.pricePerHour,
                    note: `Parqo parking - ${sheetTarget.name}`,
                  })}
                  className="flex items-center justify-center gap-2 rounded-xl border border-surface-2 py-3 text-center text-sm font-medium transition hover:border-accent"
                >
                  <Wallet className="h-4 w-4" />
                  Pay {priceLabel(sheetTarget.pricePerHour)} via UPI (Demo)
                </a>
                <p className="mt-1.5 px-1 text-center text-[10px] text-muted">
                  Demo link only — no real payment provider connected yet.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-16 left-1/2 z-40 max-w-[90vw] -translate-x-1/2 rounded-full border border-surface-2 bg-surface px-4 py-2 text-center text-xs shadow-lg sm:bottom-6">
          {toast}
        </div>
      )}
    </div>
  );
}
