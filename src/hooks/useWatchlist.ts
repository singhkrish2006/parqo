"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getWatchlist, toggleWatch } from "@/lib/watchlist";
import { requestNotificationPermission } from "@/lib/notify";

export function useWatchlist() {
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const watchedIdsRef = useRef(watchedIds);

  useEffect(() => {
    watchedIdsRef.current = watchedIds;
  }, [watchedIds]);

  useEffect(() => {
    // localStorage doesn't exist during SSR, so the watchlist is read
    // post-mount. That keeps the first client render identical to the
    // server's and avoids a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWatchedIds(getWatchlist());
  }, []);

  const toggle = useCallback((spotId: string) => {
    const updated = toggleWatch(spotId);
    setWatchedIds(new Set(updated));
    if (updated.has(spotId)) void requestNotificationPermission();
  }, []);

  return { watchedIds, watchedIdsRef, toggle };
}
