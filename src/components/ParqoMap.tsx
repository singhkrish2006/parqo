"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DELHI_CENTER, type Spot, type SpotStatus } from "@/data/spots";
import { STATUS_COLOR } from "@/lib/status";

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

function FlyTo({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat !== null && lng !== null) {
      map.flyTo([lat, lng], 15, { duration: 0.6 });
    }
  }, [lat, lng, map]);
  return null;
}

function FitRoute({ path }: { path: [number, number][] | null }) {
  const map = useMap();
  useEffect(() => {
    if (path && path.length > 1) {
      map.fitBounds(L.latLngBounds(path), { padding: [48, 48] });
    }
  }, [path, map]);
  return null;
}

export default function ParqoMap({
  spots,
  selectedId,
  onSelectSpot,
  routePath = null,
  destination = null,
}: {
  spots: Spot[];
  selectedId: string | null;
  onSelectSpot: (id: string) => void;
  routePath?: [number, number][] | null;
  destination?: { lat: number; lng: number } | null;
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
      <TileLayer
        attribution="Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS community"
        url="https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
      />
      <TileLayer url="https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}" />
      {routePath && (
        <Polyline
          positions={routePath}
          pathOptions={{ color: "#b6ff3a", weight: 4, opacity: 0.75 }}
        />
      )}
      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={destinationIcon} />
      )}
      {spots.map((s) => (
        <Marker
          key={s.id}
          position={[s.lat, s.lng]}
          icon={pinIcon(s.status, s.id === selectedId)}
          eventHandlers={{ click: () => onSelectSpot(s.id) }}
        />
      ))}
      <FlyTo lat={selected?.lat ?? null} lng={selected?.lng ?? null} />
      <FitRoute path={routePath} />
    </MapContainer>
  );
}
