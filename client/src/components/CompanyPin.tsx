import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import type { Company } from "../types";
import { useStore } from "../store";
import { typeColor, heroStat, typeLabel, pinDiameter } from "../lib/format";
import { MiniRing } from "./UrgencyRing";

// Circular divIcon (§12): fill by type, diameter by urgency, white 2px ring,
// slow pulse at urgency ≥ 85.
function buildIcon(c: Company, selected: boolean, quick: boolean): L.DivIcon {
  const d = pinDiameter(c.urgencyScore);
  const color = typeColor(c);
  const isOut = c.type === "outgrower";
  const pulse = quick
    ? isOut
      ? "pin-quick-violet"
      : "pin-quick-coral"
    : c.urgencyScore >= 85
      ? isOut
        ? "pin-pulse-violet"
        : "pin-pulse-coral"
      : "";
  const ring = selected
    ? `box-shadow:0 0 0 4px ${color}55,0 1px 4px rgba(23,23,31,0.25);`
    : `box-shadow:0 1px 4px rgba(23,23,31,0.25);`;
  const html = `<span class="${pulse}" style="
      display:block;width:${d}px;height:${d}px;border-radius:9999px;
      background:${color};border:2px solid #fff;${ring}"></span>`;
  return L.divIcon({
    html,
    className: "outgrow-pin",
    iconSize: [d, d],
    iconAnchor: [d / 2, d / 2],
  });
}

export default function CompanyPin({ company }: { company: Company }) {
  const setSelected = useStore((s) => s.setSelected);
  const selected = useStore((s) => s.selectedId === company.id);
  const quick = useStore((s) => s.pulsingIds.includes(company.id));
  const color = typeColor(company);

  return (
    <Marker
      position={[company.lat, company.lng]}
      icon={buildIcon(company, selected, quick)}
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{ click: () => setSelected(company.id) }}
    >
      <Tooltip direction="top" offset={[0, -6]} className="pin-tooltip" opacity={1}>
        <div className="w-56 rounded-card border border-border bg-card p-3 shadow-soft">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-600 text-ink">{company.name}</div>
              <div className="text-xs text-muted">
                {company.industry} · {company.arrondissement}e
              </div>
            </div>
            <MiniRing value={company.urgencyScore} color={color} />
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <span
              className="rounded-chip px-2 py-0.5 text-[11px] font-600"
              style={{
                background:
                  company.type === "outgrower"
                    ? "var(--violet-tint)"
                    : "var(--coral-tint)",
                color,
              }}
            >
              {typeLabel(company)}
            </span>
            <span className="tnum text-xs font-600 text-secondary">
              {heroStat(company)}
            </span>
          </div>
        </div>
      </Tooltip>
    </Marker>
  );
}
