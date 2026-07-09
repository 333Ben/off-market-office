import { useEffect, useState } from "react";
import { X, RefreshCw, ExternalLink, Radio } from "lucide-react";
import { useStore } from "../store";
import { fetchBodacc, type BodaccRecord } from "../lib/api";

// Live BODACC feed — REAL French insolvency filings from the public
// OpenDataSoft API. Deliberately kept separate from the synthetic demo set.
export default function BodaccFeed() {
  const open = useStore((s) => s.bodaccOpen);
  const toggle = useStore((s) => s.toggleBodacc);
  const [records, setRecords] = useState<BodaccRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    const r = await fetchBodacc(10);
    if (r.ok) setRecords(r.records);
    else setError(r.error ?? "Couldn’t reach BODACC");
    setLoading(false);
  };

  useEffect(() => {
    if (open) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1300] flex justify-end bg-black/30"
      onClick={toggle}
    >
      <div
        className="flex h-full w-[420px] flex-col bg-card shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-700 text-success">
                <Radio className="h-3 w-3" /> LIVE · real data
              </span>
            </div>
            <h2 className="mt-1.5 text-base font-700 text-ink">
              BODACC — Paris insolvency filings
            </h2>
            <p className="text-xs text-muted">
              Official French registry · separate from the synthetic demo set
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
            Recent <b>procédures collectives</b> in the 75
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
          {loading ? (
            <div className="flex flex-col gap-2 px-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-card bg-page" />
              ))}
            </div>
          ) : error ? (
            <p className="px-1 py-4 text-sm text-secondary">
              {error} — the live registry may be unreachable offline. The demo
              runs fully on synthetic data regardless.
            </p>
          ) : records.length === 0 ? (
            <p className="px-1 py-4 text-sm text-muted">No filings returned.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {records.map((r) => (
                <li
                  key={r.id}
                  className="rounded-card border border-border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-600 text-ink">
                        {r.company}
                      </div>
                      <div className="text-xs text-muted">
                        {r.ville}
                        {r.arrondissement ? ` · ${r.arrondissement}e` : ""} ·{" "}
                        {r.date}
                      </div>
                    </div>
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-muted hover:text-violet"
                        title="Open on BODACC"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  <span
                    className="mt-2 inline-block rounded-[6px] px-2 py-0.5 text-[11px] font-600"
                    style={{ background: "var(--coral-tint)", color: "var(--coral)" }}
                  >
                    {r.nature}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
