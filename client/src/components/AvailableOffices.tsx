import { useEffect, useState } from "react";
import { Building2, MapPin, Plus, Check } from "lucide-react";
import type { Company } from "../types";
import { useStore } from "../store";
import { fetchCandidates, type MatchCandidate } from "../lib/api";
import { weeksUntil } from "../lib/format";

// For a buyer (outgrower), the available offices are the releasers ranked by
// deterministic fit. Reuses the /candidates endpoint; enriches each row with
// the full releaser record from the store (available m², availability date).
export default function AvailableOffices({
  buyer,
  limit = 4,
}: {
  buyer: Company;
  limit?: number;
}) {
  const companies = useStore((s) => s.companies);
  const contactIds = useStore((s) => s.contactIds);
  const toggleContact = useStore((s) => s.toggleContact);
  const setActiveMatch = useStore((s) => s.setActiveMatch);
  const setView = useStore((s) => s.setView);
  const [candidates, setCandidates] = useState<MatchCandidate[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchCandidates(buyer.id).then((c) => alive && setCandidates(c));
    return () => {
      alive = false;
    };
  }, [buyer.id]);

  if (candidates === null) {
    return <p className="px-1 py-2 text-xs text-muted">Finding offices…</p>;
  }

  const top = candidates.slice(0, limit);
  const need = buyer.neededSqm;

  if (top.length === 0) {
    return (
      <p className="px-1 py-2 text-xs text-muted">
        No available offices match yet.
      </p>
    );
  }

  const showOnMap = (releaserId: string, score: number) => {
    setActiveMatch({ outgrowerId: buyer.id, releaserId, score });
    setView("map");
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-xs font-600 text-secondary">
        <Building2 className="h-3.5 w-3.5 text-coral" />
        Available offices for {buyer.name}
        {need != null && (
          <span className="font-400 text-muted">· needs ~{need} m²</span>
        )}
      </div>
      {top.map((cand) => {
        const office = companies.find((c) => c.id === cand.companyId);
        const inList = contactIds.includes(cand.companyId);
        const wks = office?.availableFrom ? weeksUntil(office.availableFrom) : null;
        return (
          <div
            key={cand.companyId}
            className="flex items-center gap-3 rounded-chip border border-border bg-card px-3 py-2"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: "var(--coral)" }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-600 text-ink">
                {office?.name ?? cand.name}
              </div>
              <div className="tnum text-xs text-muted">
                {office?.availableSqm ?? "—"} m² · {cand.arrondissement}e
                {wks != null ? ` · in ${wks} wk${wks === 1 ? "" : "s"}` : ""}
              </div>
            </div>

            {/* Fit score */}
            <div className="flex shrink-0 flex-col items-end">
              <span className="tnum text-sm font-700 text-ink">{cand.score}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted">
                fit
              </span>
            </div>

            <button
              onClick={() => showOnMap(cand.companyId, cand.score)}
              title="Show on map"
              className="shrink-0 text-muted hover:text-violet"
            >
              <MapPin className="h-4 w-4" />
            </button>
            <button
              onClick={() => toggleContact(cand.companyId)}
              title={inList ? "Remove from list" : "Add office to list"}
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-chip border transition ${
                inList
                  ? "border-violet bg-violet text-white"
                  : "border-border text-muted hover:text-violet"
              }`}
            >
              {inList ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
