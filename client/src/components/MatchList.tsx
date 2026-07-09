import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import type { Company, Match } from "../types";
import { useStore } from "../store";
import { fetchCandidates, fetchMatches, type MatchCandidate } from "../lib/api";

export default function MatchList({ company }: { company: Company }) {
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const setActiveMatch = useStore((s) => s.setActiveMatch);
  const companies = useStore((s) => s.companies);

  useEffect(() => {
    let alive = true;
    fetchCandidates(company.id).then((c) => alive && setCandidates(c));
    fetchMatches().then((m) => alive && setMatches(m));
    return () => {
      alive = false;
    };
  }, [company.id, company.matchIds.length]);

  const storedFor = (otherId: string) =>
    matches.find(
      (m) =>
        (m.outgrowerId === company.id && m.releaserId === otherId) ||
        (m.releaserId === company.id && m.outgrowerId === otherId)
    );

  const show = (otherId: string, score: number) => {
    const [outgrowerId, releaserId] =
      company.type === "outgrower" ? [company.id, otherId] : [otherId, company.id];
    setActiveMatch({ outgrowerId, releaserId, score });
  };

  if (candidates.length === 0) {
    return (
      <section>
        <h3 className="mb-3 text-xs font-600 uppercase tracking-wide text-muted">
          Matches
        </h3>
        <p className="text-sm text-muted">
          No matches yet — lower the urgency filter or run the agent.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h3 className="mb-3 text-xs font-600 uppercase tracking-wide text-muted">
        Matches
      </h3>
      <div className="flex flex-col gap-2.5">
        {candidates.map((cand) => {
          const stored = storedFor(cand.companyId);
          const other = companies.find((c) => c.id === cand.companyId);
          return (
            <div
              key={cand.companyId}
              className="rounded-card border border-border bg-card p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-600 text-ink">
                    {other?.name ?? cand.name}
                  </div>
                  <div className="text-xs text-muted">
                    {cand.arrondissement}e ·{" "}
                    {other?.type === "releaser" ? "releasing" : "needs space"}
                  </div>
                </div>
                <span className="tnum shrink-0 text-lg font-700 text-ink">
                  {cand.score}
                </span>
              </div>

              {/* Score bar */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-page">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${cand.score}%`,
                    background:
                      "linear-gradient(90deg, var(--violet), var(--coral))",
                  }}
                />
              </div>

              {stored?.rationale && (
                <p className="mt-2 text-xs text-secondary">{stored.rationale}</p>
              )}

              <button
                onClick={() => show(cand.companyId, cand.score)}
                className="mt-2.5 flex items-center gap-1.5 text-xs font-600 text-violet hover:text-violet-hover"
              >
                <MapPin className="h-3.5 w-3.5" /> Show on map
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
