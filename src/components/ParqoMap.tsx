"use client";

import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DELHI_CENTER, type Spot, type SpotStatus } from "@/data/spots";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/status";
import { TILE_LAYERS, usingDefaultTiles } from "@/lib/mapConfig";
import { prefersReducedMotion } from "@/lib/motion";

function pinIcon(status: SpotStatus, active: boolean) {
  const color = STATUS_COLOR[status];
  const size = active ? 40 : 32;
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:${size}px;height:${size}px;
        border-radius:9999px 9999px 9999px 0;
        transform: rotate(45deg);
        background:#141414;
        border:2px solid ${color};
        box-shadow:0 0 0 ${active ? 4 : 0}px rgba(182,255,58,0.25);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="
          transform: rotate(-45deg);
          color:${color};
          font-weight:700;
          font-size:${active ? 15 : 12}px;
          font-family: ui-monospace, monospace;
        ">P</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

const destinationIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width:16px;height:16px;border-radius:9999px;
      background:#b6ff3a;border:3px solid #141414;
      box-shadow:0 0 0 2px #b6ff3a;
    "></div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const pickedIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width:22px;height:22px;border-radius:9999px;
      background:#b6ff3a;border:4px solid #141414;
      box-shadow:0 0 0 3px #b6ff3a, 0 0 0 9px rgba(182,255,58,0.25);
    "></div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function FlyTo({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat === null || lng === null) return;
    const size = map.getSize();
    // flyTo divides by the container size, so a zero-sized map (e.g. in a
    // hidden tab) would throw. Jump there instead of animating.
    if (prefersReducedMotion() || size.x === 0 || size.y === 0) {
      map.setView([lat, lng], 15, { animate: false });
    } else {
      map.flyTo([lat, lng], 15, { duration: 0.6 });
    }
  }, [lat, lng, map]);
  return null;
}

function FitRoute({ path }: { path: [number, number][] | null }) {
  const map = useMap();
  useEffect(() => {
    if (path && path.length > 1) {
      map.fitBounds(L.latLngBounds(path), {
        padding: [48, 48],
        animate: !prefersReducedMotion(),
      });
    }
  }, [path, map]);
  return null;
}

function LocationPicker({
  active,
  onPick,
}: {
  active: boolean;
  onPick: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    click(e) {
      if (active) onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  // MapContainer only reads className on mount, so toggle the cursor class
  // on the container element directly.
  useEffect(() => {
    map.getContainer().classList.toggle("parqo-picking", active);
  }, [map, active]);
  return null;
}

function WarnAboutDefaultTiles() {
  useEffect(() => {
    if (usingDefaultTiles && process.env.NODE_ENV === "production") {
      console.warn(
        "Parqo: using the default Esri dev tiles. Set NEXT_PUBLIC_MAP_TILE_URL to a licensed tile provider before launch.",
      );
    }
  }, []);
  return null;
}

export default function ParqoMap({
  spots,
  selectedId,
  onSelectSpot,
  routePath = null,
  destination = null,
  pickMode = false,
  pickedLocation = null,
  onPickLocation,
}: {
  spots: Spot[];
  selectedId: string | null;
  onSelectSpot: (id: string) => void;
  routePath?: [number, number][] | null;
  destination?: { lat: number; lng: number } | null;
  pickMode?: boolean;
  pickedLocation?: { lat: number; lng: number } | null;
  onPickLocation?: (lat: number, lng: number) => void;
}) {
  const selected = spots.find((s) => s.id === selectedId) ?? null;

  return (
    <MapContainer
      center={DELHI_CENTER}
      zoom={12}
      zoomControl={false}
      className="h-full w-full"
      style={{ background: "#0a0a0a" }}
    >
      {TILE_LAYERS.map((layer) => (
        <TileLayer key={layer.url} url={layer.url} attribution={layer.attribution} />
      ))}
      <WarnAboutDefaultTiles />
      {routePath && (
        <Polyline
          positions={routePath}
          pathOptions={{ color: "#b6ff3a", weight: 4, opacity: 0.75 }}
        />
      )}
      {destination && (
        <Marker
          position={[destination.lat, destination.lng]}
          icon={destinationIcon}
          interactive={false}
        />
      )}
      {pickedLocation && (
        <Marker
          position={[pickedLocation.lat, pickedLocation.lng]}
          icon={pickedIcon}
          interactive={false}
        />
      )}
      {spots.map((s) => (
        <Marker
          key={s.id}
          position={[s.lat, s.lng]}
          icon={pinIcon(s.status, s.id === selectedId)}
          title={`${s.name} — ${STATUS_LABEL[s.status]}`}
          alt={`${s.name}, ${STATUS_LABEL[s.status]}`}
          eventHandlers={{ click: () => onSelectSpot(s.id) }}
        />
      ))}
      <FlyTo lat={selected?.lat ?? null} lng={selected?.lng ?? null} />
      <FitRoute path={routePath} />
      <LocationPicker active={pickMode} onPick={(lat, lng) => onPickLocation?.(lat, lng)} />
    </MapContainer>
  );
}
