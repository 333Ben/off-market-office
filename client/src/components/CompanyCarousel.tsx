import { useMemo } from "react";
import { Building2, DoorOpen } from "lucide-react";
import { useStore, applyFilters } from "../store";
import type { Company } from "../types";
import { typeColor, typeLabel, heroStat } from "../lib/format";
import { MiniRing } from "./UrgencyRing";

// Horizontal strip of company cards along the bottom of the map (reference look).
export default function CompanyCarousel() {
  const all = useStore((s) => s.companies);
  const tab = useStore((s) => s.tab);
  const filters = useStore((s) => s.filters);
  const search = useStore((s) => s.search);
  const selectedId = useStore((s) => s.selectedId);
  const setSelected = useStore((s) => s.setSelected);

  const cards = useMemo(
    () =>
      applyFilters(all, tab, filters, search).sort(
        (a, b) => b.urgencyScore - a.urgencyScore
      ),
    [all, tab, filters, search]
  );

  if (cards.length === 0) return null;

  return (
    <div className="pointer-events-auto absolute inset-x-4 bottom-4 z-[1000]">
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((c) => (
          <Card
            key={c.id}
            company={c}
            active={c.id === selectedId}
            onClick={() => setSelected(c.id)}
          />
        ))}
      </div>
    </div>
  );
}

function Card({
  company,
  active,
  onClick,
}: {
  company: Company;
  active: boolean;
  onClick: () => void;
}) {
  const color = typeColor(company);
  const isOut = company.type === "outgrower";
  const Icon = isOut ? Building2 : DoorOpen;

  const sub = isOut
    ? `${company.headcount} staff · ${company.openRoles} roles`
    : `was ${company.wasHeadcount} · ${company.motivation}`;

  return (
    <button
      onClick={onClick}
      className={`group flex w-[228px] shrink-0 flex-col overflow-hidden rounded-card border bg-card text-left shadow-soft transition ${
        active ? "border-transparent ring-2" : "border-border hover:shadow-pop"
      }`}
      style={active ? { ["--tw-ring-color" as any]: color } : undefined}
    >
      {/* Header block (stands in for the listing photo) */}
      <div
        className="relative flex h-16 items-center justify-between px-3"
        style={{
          background: isOut ? "var(--violet-tint)" : "var(--coral-tint)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="flex items-center gap-1.5 rounded-chip bg-card/80 px-2 py-1 text-[11px] font-600 backdrop-blur"
            style={{ color }}
          >
            <Icon className="h-3.5 w-3.5" />
            {typeLabel(company)}
          </span>
          {company.origin === "bodacc" && (
            <span className="rounded-chip bg-success/15 px-1.5 py-1 text-[10px] font-700 text-success">
              LIVE
            </span>
          )}
        </div>
        <MiniRing value={company.urgencyScore} color={color} />
      </div>

      {/* Body */}
      <div className="flex flex-col gap-0.5 p-3">
        <span className="tnum text-lg font-700 leading-tight text-ink">
          {heroStat(company)}
        </span>
        <span className="truncate text-sm font-600 text-ink">
          {company.name}
        </span>
        <span className="truncate text-xs text-muted">
          {company.industry} · {company.arrondissement}e Paris
        </span>
        <span className="mt-1 truncate text-xs font-500 text-secondary">
          {sub}
        </span>
      </div>
    </button>
  );
}
