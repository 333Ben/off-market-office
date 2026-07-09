import { useEffect, useState } from "react";
import { X, RefreshCw, Radio, ExternalLink } from "lucide-react";
import { useStore } from "../store";
import {
  fetchSillage,
  type SillageAccount,
  type SillageSignal,
} from "../lib/api";

// Live Sillage feed — REAL demand-side data (the team's tracked accounts and
// their hiring / job-change / exec signals) via Sillage's v2 API. Separate from
// the synthetic demo set.
export default function SillageFeed() {
  const open = useStore((s) => s.sillageOpen);
  const toggle = useStore((s) => s.toggleSillage);
  const [accounts, setAccounts] = useState<SillageAccount[]>([]);
  const [signals, setSignals] = useState<SillageSignal[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    const r = await fetchSillage();
    setEnabled(r.enabled);
    setAccounts(r.accounts);
    setSignals(r.signals);
    if (!r.ok) setError(r.error ?? "Couldn’t reach Sillage");
    setLoading(false);
  };

  useEffect(() => {
    if (open) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1300] flex justify-end bg-black/30" onClick={toggle}>
      <div
        className="flex h-full w-[420px] flex-col bg-card shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <span className="flex w-fit items-center gap-1 rounded-full bg-violet-tint px-2 py-0.5 text-[11px] font-700 text-violet">
              <Radio className="h-3 w-3" /> LIVE · Sillage
            </span>
            <h2 className="mt-1.5 text-base font-700 text-ink">
              Tracked accounts & signals
            </h2>
            <p className="text-xs text-muted">
              Real demand-side data · separate from the synthetic demo set
            </p>
          </div>
          <button
            onClick={toggle}
            className="grid h-8 w-8 place-items-center rounded-chip text-muted hover:bg-page hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between px-5 py-2.5">
          <span className="text-xs text-secondary">
            {accounts.length} tracked · {signals.length} recent signals
          </span>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-600 text-violet hover:text-violet-hover disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-5">
          {!enabled ? (
            <p className="px-1 py-4 text-sm text-secondary">
              Sillage isn’t configured. Add <code>SILLAGE_API_KEY</code> to
              <code> .env</code> to go live.
            </p>
          ) : loading ? (
            <div className="flex flex-col gap-2 px-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-card bg-page" />
              ))}
            </div>
          ) : (
            <>
              {error && (
                <p className="mb-3 rounded-card bg-coral-tint px-3 py-2 text-xs text-coral">
                  {error}
                </p>
              )}

              {/* Signals */}
              <h3 className="mb-2 mt-1 text-xs font-600 uppercase tracking-wide text-muted">
                Recent signals
              </h3>
              {signals.length === 0 ? (
                <p className="mb-4 rounded-card border border-dashed border-border px-3 py-3 text-xs text-muted">
                  No signals yet — Sillage is still ingesting for your{" "}
                  {accounts.length} accounts. New hiring, job-change and exec
                  moves will stream in here.
                </p>
              ) : (
                <ul className="mb-4 flex flex-col gap-2">
                  {signals.map((s) => (
                    <li key={s.id} className="rounded-card border border-border bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-600 text-ink">
                          {s.company}
                        </span>
                        <span className="shrink-0 rounded-[6px] bg-violet-tint px-1.5 py-0.5 text-[10px] font-600 text-violet">
                          {s.type}
                        </span>
                      </div>
                      {s.author && (
                        <div className="mt-0.5 truncate text-[11px] text-muted">
                          {s.author}
                          {s.headline ? ` · ${s.headline}` : ""}
                        </div>
                      )}
                      <p className="mt-1 text-xs text-secondary">“{s.title}”</p>
                      <div className="mt-1 flex items-center gap-2">
                        {s.date && (
                          <span className="text-[11px] text-muted">
                            {new Date(s.date).toLocaleDateString()}
                          </span>
                        )}
                        {s.url && (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-600 text-violet hover:text-violet-hover"
                          >
                            view →
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Tracked accounts */}
              <h3 className="mb-2 text-xs font-600 uppercase tracking-wide text-muted">
                Tracked accounts
              </h3>
              <ul className="flex flex-col gap-1.5">
                {accounts.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2.5 rounded-card border border-border bg-card p-2.5"
                  >
                    {a.logoUrl ? (
                      <img
                        src={a.logoUrl}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-chip object-cover"
                        onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                      />
                    ) : (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-chip bg-violet-tint text-xs font-700 text-violet">
                        {a.name[0]}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-600 text-ink">
                        {a.name}
                      </div>
                      {a.domain && (
                        <div className="truncate text-xs text-muted">{a.domain}</div>
                      )}
                    </div>
                    {a.linkedinUrl && (
                      <a
                        href={a.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-muted hover:text-violet"
                        title="LinkedIn"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
