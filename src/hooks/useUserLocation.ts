"use client";

import { useEffect, useState } from "react";
import { getCurrentLatLng, type LatLng } from "@/lib/geolocation";

export function useUserLocation() {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentLatLng(6000).then((result) => {
      if (cancelled) return;
      if (result) setPosition(result);
      else setDenied(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { position, denied };
}
