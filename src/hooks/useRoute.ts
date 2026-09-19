"use client";

import { useCallback, useRef, useState } from "react";
import { fetchDrivingRoute, geocode, type LatLng } from "@/lib/routing";

export type Destination = { name: string; lat: number; lng: number };

export function useRoute(origin: LatLng, onError: (message: string) => void) {
  const [searchValue, setSearchValue] = useState("");
  const [destination, setDestination] = useState<Destination | null>(null);
  const [routePath, setRoutePath] = useState<LatLng[] | null>(null);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  const search = useCallback(async () => {
    const query = searchValue.trim();
    if (!query) return;
    const id = ++requestId.current;
    setLoading(true);

    const dest = await geocode(`${query}, Delhi, India`);
    if (id !== requestId.current) return;
    if (!dest) {
      setLoading(false);
      onError("Couldn't find that place — try a different search");
      return;
    }

    const path = await fetchDrivingRoute(origin, dest);
    if (id !== requestId.current) return;
    setDestination({ name: query, lat: dest[0], lng: dest[1] });
    setRoutePath(path);
    setLoading(false);
    if (!path) onError("Found the place but couldn't fetch a route right now");
  }, [searchValue, origin, onError]);

  const clear = useCallback(() => {
    requestId.current += 1;
    setSearchValue("");
    setDestination(null);
    setRoutePath(null);
    setLoading(false);
  }, []);

  return { searchValue, setSearchValue, destination, routePath, loading, search, clear };
}
