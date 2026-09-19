"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { spots as seedSpots, type Spot, type SpotStatus } from "@/data/spots";
import { fetchSpots, subscribeToSpotUpdates } from "@/lib/spotsRepo";

/** Loads spots (live from Supabase when configured, otherwise the seed list)
 * and keeps them in sync with realtime updates from other drivers. */
export function useSpots(onStatusChange?: (previous: Spot, next: Spot) => void) {
  const [spots, setSpots] = useState<Spot[]>(seedSpots);
  const [isLive, setIsLive] = useState(false);

  const spotsRef = useRef(spots);
  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => {
    spotsRef.current = spots;
    onStatusChangeRef.current = onStatusChange;
  });

  useEffect(() => {
    let cancelled = false;
    fetchSpots().then(({ spots: loaded, live }) => {
      if (cancelled) return;
      setSpots(loaded);
      setIsLive(live);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return subscribeToSpotUpdates((updated) => {
      const previous = spotsRef.current.find((s) => s.id === updated.id);
      if (previous) onStatusChangeRef.current?.(previous, updated);
      setSpots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    });
  }, []);

  const setLocalStatus = useCallback((id: string, status: SpotStatus) => {
    setSpots((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }, []);

  return { spots, isLive, setLocalStatus };
}
