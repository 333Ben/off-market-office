import { useEffect, useState } from "react";
import { X, RefreshCw, Copy } from "lucide-react";
import type { Company, OutreachDraft } from "../types";
import { useStore } from "../store";
import { draftOutreach, fetchCompany } from "../lib/api";

export default function OutreachModal({
  company,
  onClose,
}: {
  company: Company;
  onClose: () => void;
}) {
  const channel = company.type === "outgrower" ? "email" : "phone_script";
  const [draft, setDraft] = useState<OutreachDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<"en" | "fr">("en");
  const showToast = useStore((s) => s.showToast);
  const upsertCompany = useStore((s) => s.upsertCompany);

  const generate = async (l: "en" | "fr" = lang) => {
    setLoading(true);
    try {
      const d = await draftOutreach(company.id, channel, l);
      setDraft(d);
    } catch {
      setDraft({
        id: "err",
        companyId: company.id,
        channel,
        body: "Couldn’t draft right now — try Regenerate.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id]);

  const approve = async () => {
    if (!draft) return;
    const text = draft.subject
      ? `Subject: ${draft.subject}\n\n${draft.body}`
      : draft.body;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard may be blocked; still mark contacted */
    }
    // Optimistic status bump so the panel reflects "contacted".
    upsertCompany({ ...company, status: "contacted" });
    fetchCompany(company.id).then(upsertCompany).catch(() => {});
    showToast("Copied — status: contacted");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1300] grid place-items-center bg-black/30 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-panel bg-card shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-700 text-ink">
              {channel === "email" ? "Draft outreach email" : "Phone script"}
            </h2>
            <p className="text-xs text-muted">
              {company.name} · {company.contact?.fullName ?? "decision maker"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Language toggle (Phase 5) */}
            <div className="flex items-center gap-1 rounded-chip bg-page p-0.5">
              {(["en", "fr"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    if (l !== lang) {
                      setLang(l);
                      generate(l);
                    }
                  }}
                  className={`rounded-[7px] px-2.5 py-1 text-xs font-600 transition ${
                    lang === l
                      ? "bg-card text-ink shadow-sm"
                      : "text-secondary hover:text-ink"
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-chip text-muted hover:bg-page hover:text-ink"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col gap-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-3 animate-pulse rounded bg-page"
                  style={{ width: `${90 - i * 8}%` }}
                />
              ))}
              <p className="mt-2 text-xs text-muted">Claude is drafting…</p>
            </div>
          ) : (
            <>
              {draft?.subject && (
                <div className="mb-3">
                  <div className="text-xs font-600 uppercase tracking-wide text-muted">
                    Subject
                  </div>
                  <div className="text-sm font-600 text-ink">
                    {draft.subject}
                  </div>
                </div>
              )}
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink">
                {draft?.body}
              </pre>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
          <button
            onClick={() => generate()}
            disabled={loading}
            className="flex items-center gap-2 rounded-chip border border-border px-4 py-2 text-sm font-600 text-secondary hover:text-ink disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" /> Regenerate
          </button>
          <button
            onClick={approve}
            disabled={loading}
            className="flex items-center gap-2 rounded-full bg-violet px-5 py-2 text-sm font-600 text-white hover:bg-violet-hover disabled:opacity-50"
          >
            <Copy className="h-4 w-4" /> Approve & copy
          </button>
        </div>
      </div>
    </div>
  );
}
