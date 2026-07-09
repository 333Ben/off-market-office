import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { useStore, applyFilters, findCompany } from "../store";
import CompanyPin from "./CompanyPin";
import MatchArc from "./MatchArc";
import Toast from "./Toast";

// CARTO Positron light tiles (§5) — no API key, attribution required.
const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const PARIS_CENTER: [number, number] = [48.8656, 2.345];

// Keeps Leaflet sized to its (animating) container and flies to the selection.
const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function MapController() {
  const map = useMap();
  const selectedId = useStore((s) => s.selectedId);
  const companies = useStore((s) => s.companies);
  const prev = useRef<string | null>(null);

  // Resize the map as the detail panel slides the container width (§12).
  useEffect(() => {
    const opening = !!selectedId !== !!prev.current;
    prev.current = selectedId;
    if (!opening) return;
    const timers = [60, 180, 320].map((t) =>
      window.setTimeout(() => map.invalidateSize({ animate: true }), t)
    );
    return () => timers.forEach(clearTimeout);
  }, [selectedId, map]);

  // Fly to the selected company (e.g. picked from search).
  useEffect(() => {
    const c = findCompany(companies, selectedId);
    if (!c) return;
    const zoom = Math.max(map.getZoom(), 14);
    if (prefersReduced()) map.setView([c.lat, c.lng], zoom, { animate: false });
    else map.flyTo([c.lat, c.lng], zoom, { duration: 0.6 });
  }, [selectedId, companies, map]);

  // Fit both pins when a match arc appears.
  const activeMatch = useStore((s) => s.activeMatch);
  useEffect(() => {
    if (!activeMatch) return;
    const out = companies.find((c) => c.id === activeMatch.outgrowerId);
    const rel = companies.find((c) => c.id === activeMatch.releaserId);
    if (!out || !rel) return;
    const bounds = L.latLngBounds([out.lat, out.lng], [rel.lat, rel.lng]);
    if (prefersReduced())
      map.fitBounds(bounds, { padding: [120, 120], maxZoom: 15, animate: false });
    else
      map.flyToBounds(bounds, { padding: [120, 120], duration: 0.7, maxZoom: 15 });
  }, [activeMatch, companies, map]);

  return null;
}

export default function MapView() {
  const all = useStore((s) => s.companies);
  const tab = useStore((s) => s.tab);
  const filters = useStore((s) => s.filters);
  const search = useStore((s) => s.search);
  const companies = useMemo(
    () => applyFilters(all, tab, filters, search),
    [all, tab, filters, search]
  );
  const activeMatch = useStore((s) => s.activeMatch);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={PARIS_CENTER}
        zoom={13}
        minZoom={12}
        maxZoom={17}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
        <MapController />
        {companies.map((c) => (
          <CompanyPin key={c.id} company={c} />
        ))}
        {activeMatch && <MatchArc match={activeMatch} />}
      </MapContainer>
      <Toast />

      {/* Result count + synthetic-data note (bottom-right, clear of the agent popup) */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-[1000] flex items-center gap-2">
        <span className="rounded-chip bg-card/90 px-2.5 py-1 text-xs font-600 text-ink shadow-soft backdrop-blur tnum">
          {companies.length} shown
        </span>
        <span className="rounded-chip bg-card/90 px-2.5 py-1 text-xs text-muted shadow-soft backdrop-blur">
          Demo data is synthetic
        </span>
      </div>
    </div>
  );
}
