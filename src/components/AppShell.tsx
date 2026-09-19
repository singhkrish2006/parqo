"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { DELHI_CENTER, type Spot, type SpotStatus } from "@/data/spots";
import { nearestMetroParking } from "@/data/metroParkings";
import { useRoute } from "@/hooks/useRoute";
import { useSpots } from "@/hooks/useSpots";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useWatchlist } from "@/hooks/useWatchlist";
import { getCurrentLatLng } from "@/lib/geolocation";
import { reportFailureMessage, suggestionFailureMessage } from "@/lib/messages";
import { showNotification } from "@/lib/notify";
import {
  destinationLooksFull,
  rankSpots,
  type CategoryFilter,
  type SortMode,
} from "@/lib/spotFilters";
import { getRecentAgreement, submitReport, submitSpotSuggestion } from "@/lib/spotsRepo";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/status";
import type { SpotSuggestionInput } from "@/lib/suggestions";
import SpotSheet from "@/components/SpotSheet";
import SpotsPanel from "@/components/SpotsPanel";
import SuggestSpotSheet from "@/components/SuggestSpotSheet";
import TopBar from "@/components/TopBar";

const ParqoMap = dynamic(() => import("@/components/ParqoMap"), {
  ssr: false,
});

export default function AppShell() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("nearest");
  const [panelOpen, setPanelOpen] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [agreement, setAgreement] = useState(0);
  const [reporting, setReporting] = useState(false);

  // "Suggest a spot" flow
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [draftLocation, setDraftLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { position: userPos, denied: locationDenied } = useUserLocation();
  const origin = userPos ?? DELHI_CENTER;

  const { watchedIds, watchedIdsRef, toggle: toggleWatchSpot } = useWatchlist();

  const handleStatusChange = useCallback(
    (previous: Spot, next: Spot) => {
      if (
        previous.status !== "open" &&
        next.status === "open" &&
        watchedIdsRef.current.has(next.id)
      ) {
        setToast(`${next.name} just opened up — you're watching it`);
        void showNotification("Parqo", `${next.name} just opened up`);
      }
    },
    [watchedIdsRef],
  );

  const { spots, isLive, setLocalStatus } = useSpots(handleStatusChange);

  const showToast = useCallback((message: string) => setToast(message), []);
  const route = useRoute(origin, showToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const rankedSpots = useMemo(
    () =>
      rankSpots({
        spots,
        categoryFilter,
        sortMode,
        origin,
        routePath: route.routePath,
        watchedIds,
      }),
    [spots, categoryFilter, sortMode, origin, route.routePath, watchedIds],
  );

  // Only an explicit click (marker or card) selects a spot, so the map never
  // flies anywhere on load.
  const activeSpot = spots.find((s) => s.id === selectedId) ?? null;
  const sheetTarget = activeSpot ?? rankedSpots[0] ?? null;
  const highlightId = selectedId ?? rankedSpots[0]?.id ?? null;

  const metroSuggestion = useMemo(
    () => (sheetTarget ? nearestMetroParking([sheetTarget.lat, sheetTarget.lng]) : null),
    [sheetTarget],
  );

  const parkAndRide = useMemo(() => {
    const destination = route.destination;
    if (!destination || !destinationLooksFull(spots, destination)) return null;
    const { metro, distance } = nearestMetroParking([destination.lat, destination.lng]);
    return {
      destinationName: destination.name,
      metroName: metro.name,
      distanceKm: distance,
      lat: metro.lat,
      lng: metro.lng,
    };
  }, [route.destination, spots]);

  const sheetSpotId = sheetTarget?.id;
  const sheetSpotStatus = sheetTarget?.status;
  useEffect(() => {
    if (!sheetSpotId || !sheetSpotStatus || !isLive) return;
    let cancelled = false;
    getRecentAgreement(sheetSpotId, sheetSpotStatus).then((count) => {
      if (!cancelled) setAgreement(count);
    });
    return () => {
      cancelled = true;
      setAgreement(0);
    };
  }, [sheetSpotId, sheetSpotStatus, isLive]);

  function selectSpot(id: string) {
    if (picking) return;
    setSelectedId(id);
    setSheetOpen(true);
  }

  async function reportStatus(status: SpotStatus) {
    if (!sheetTarget || reporting) return;
    const id = sheetTarget.id;

    if (!isLive) {
      setLocalStatus(id, status);
      setToast(
        "Report applied on this device. Connect a database to share reports with other drivers.",
      );
      return;
    }

    setReporting(true);
    // Reports only count from drivers physically near the spot, so a fresh
    // position is required and the database re-checks the distance.
    const position = userPos ?? (await getCurrentLatLng());
    if (!position) {
      setReporting(false);
      setToast(reportFailureMessage("location_required"));
      return;
    }

    const result = await submitReport(id, status, position);
    setReporting(false);
    if (result.ok) {
      setLocalStatus(id, status);
      setToast("Reported — visible to every driver on Parqo now");
    } else {
      setToast(reportFailureMessage(result.reason));
    }
  }

  async function submitSuggestion(input: SpotSuggestionInput): Promise<string | null> {
    if (!isLive) {
      return "Suggestions need a database connection, which isn't configured here.";
    }
    const result = await submitSpotSuggestion(input);
    if (!result.ok) return suggestionFailureMessage(result.reason);
    setSuggestOpen(false);
    setDraftLocation(null);
    setToast("Thanks — your suggestion was sent for review.");
    return null;
  }

  function closeSuggest() {
    setSuggestOpen(false);
    setPicking(false);
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <main className="absolute inset-0 z-0 isolate" aria-label="Parking map">
        <ParqoMap
          spots={rankedSpots}
          selectedId={selectedId}
          onSelectSpot={selectSpot}
          routePath={route.routePath}
          destination={route.destination}
          pickMode={picking}
          pickedLocation={draftLocation}
          onPickLocation={(lat, lng) => {
            setDraftLocation({ lat, lng });
            setPicking(false);
          }}
        />
      </main>

      <TopBar
        isLive={isLive}
        searchValue={route.searchValue}
        onSearchChange={route.setSearchValue}
        onSearchSubmit={route.search}
        routeLoading={route.loading}
        destinationName={route.destination?.name ?? null}
        routeReady={route.routePath !== null}
        onClearRoute={route.clear}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        watchedCount={watchedIds.size}
        sortMode={sortMode}
        onSortChange={setSortMode}
        showSort={route.routePath === null}
        showLocationBanner={locationDenied && !bannerDismissed}
        onDismissLocationBanner={() => setBannerDismissed(true)}
      />

      <div
        aria-label="Status legend"
        className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-col gap-1.5 rounded-xl border border-surface-2 bg-surface/95 px-3 py-2 text-xs text-muted shadow-sm backdrop-blur sm:flex-row sm:gap-3 sm:rounded-full sm:py-1.5"
      >
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

      <button
        onClick={() => setSuggestOpen(true)}
        className="absolute bottom-24 left-3 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-black shadow-lg transition hover:brightness-90 sm:bottom-16"
        aria-label="Suggest a parking spot"
        title="Suggest a parking spot"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
      </button>

      <SpotsPanel
        open={panelOpen}
        onToggle={() => setPanelOpen((open) => !open)}
        spots={rankedSpots}
        origin={origin}
        selectedId={selectedId}
        highlightId={highlightId}
        watchedIds={watchedIds}
        onSelect={selectSpot}
        parkAndRide={parkAndRide}
      />

      {sheetOpen && sheetTarget && (
        <SpotSheet
          spot={sheetTarget}
          origin={origin}
          watched={watchedIds.has(sheetTarget.id)}
          agreement={agreement}
          metroSuggestion={metroSuggestion}
          reporting={reporting}
          onClose={() => setSheetOpen(false)}
          onToggleWatch={() => toggleWatchSpot(sheetTarget.id)}
          onReport={reportStatus}
        />
      )}

      {suggestOpen && (
        <SuggestSpotSheet
          hidden={picking}
          location={draftLocation}
          onPickOnMap={() => setPicking(true)}
          onLocationChange={setDraftLocation}
          onClose={closeSuggest}
          onSubmit={submitSuggestion}
        />
      )}

      {picking && (
        <div
          role="status"
          className="absolute left-1/2 top-4 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-accent bg-surface px-4 py-2 text-xs shadow-lg"
        >
          Tap the map to place the spot
          <button
            onClick={() => setPicking(false)}
            className="flex items-center gap-1 rounded-full text-muted transition hover:text-foreground"
            aria-label="Cancel choosing a location"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Cancel
          </button>
        </div>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="absolute bottom-16 left-1/2 z-40 max-w-[90vw] -translate-x-1/2 rounded-full border border-surface-2 bg-surface px-4 py-2 text-center text-xs shadow-lg sm:bottom-6"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
