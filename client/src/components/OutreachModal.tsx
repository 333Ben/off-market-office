import { useEffect, useState } from "react";
import { X, RefreshCw, Copy, Mail, Linkedin, Phone, Check } from "lucide-react";
import type { Cadence, CadenceChannel, Company } from "../types";
import { useStore } from "../store";
import { fetchCadence, fetchCompany } from "../lib/api";

const CHANNEL: Record<
  CadenceChannel,
  { label: string; Icon: typeof Mail; accent: string; tint: string }
> = {
  email: { label: "Email", Icon: Mail, accent: "#4F46E5", tint: "#ECEDFE" },
  linkedin: { label: "LinkedIn", Icon: Linkedin, accent: "#0A66C2", tint: "#E7F0FA" },
  phone: { label: "Call", Icon: Phone, accent: "#FF5A5F", tint: "#FFECED" },
};

function cadenceToText(company: Company, cad: Cadence): string {
  const blocks = cad.steps.map((s) => {
    const lines = [`Day ${s.day} · ${CHANNEL[s.channel].label}`];
    if (s.subject) lines.push(`Subject: ${s.subject}`);
    lines.push(s.body);
    return lines.join("\n");
  });
  return [`Multi-channel cadence — ${company.name}`, ...blocks].join("\n\n");
}

export default function OutreachModal({
  company,
  onClose,
}: {
  company: Company;
  onClose: () => void;
}) {
  const [cadence, setCadence] = useState<Cadence | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<"en" | "fr">("en");
  const showToast = useStore((s) => s.showToast);
  const upsertCompany = useStore((s) => s.upsertCompany);

  const generate = async (l: "en" | "fr" = lang) => {
    setLoading(true);
    try {
      const c = await fetchCadence(company.id, l, company.matchIds[0]);
      setCadence(c);
    } catch {
      setCadence(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id]);

  const approve = async () => {
    if (!cadence) return;
    try {
      await navigator.clipboard.writeText(cadenceToText(company, cadence));
    } catch {
      /* clipboard may be blocked; still mark contacted */
    }
    upsertCompany({ ...company, status: "contacted" });
    fetchCompany(company.id).then(upsertCompany).catch(() => {});
    showToast("Cadence copied — status: contacted");
    onClose();
  };

  const variants = cadence?.subjectVariants ?? [];
  const chosenIdx = Math.max(
    0,
    variants.findIndex((v) => v === cadence?.variantPick?.choice)
  );

  return (
    <div
      className="fixed inset-0 z-[1300] grid place-items-center bg-black/30 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-panel bg-card shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-700 text-ink">Multi-channel cadence</h2>
            <p className="text-xs text-muted">
              {company.name} · {company.contact?.fullName ?? "decision maker"}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="h-3 animate-pulse rounded bg-page"
                  style={{ width: `${92 - i * 7}%` }}
                />
              ))}
              <p className="mt-2 text-xs text-muted">Claude is planning the cadence…</p>
            </div>
          ) : !cadence ? (
            <p className="text-sm text-secondary">
              Couldn’t plan a cadence right now — try Regenerate.
            </p>
          ) : (
            <>
              {/* A/B subject test — the agent reasons about which to lead with */}
              {variants.length >= 2 && (
                <div className="mb-5 rounded-card border border-border bg-page/60 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-chip bg-violet-tint px-2 py-0.5 text-[11px] font-700 uppercase tracking-wide text-violet">
                      A/B subject
                    </span>
                    <span className="text-xs text-muted">
                      Agent picks the lead line
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {variants.map((v, i) => {
                      const picked = i === chosenIdx;
                      return (
                        <div
                          key={i}
                          className={`flex items-start gap-2 rounded-chip border px-3 py-2 text-sm ${
                            picked
                              ? "border-violet bg-card text-ink font-600"
                              : "border-border bg-card/50 text-secondary"
                          }`}
                        >
                          <span className="mt-0.5 text-[11px] font-700 text-muted">
                            {i === 0 ? "A" : "B"}
                          </span>
                          <span className="flex-1">{v}</span>
                          {picked && <Check className="mt-0.5 h-4 w-4 text-violet" />}
                        </div>
                      );
                    })}
                  </div>
                  {cadence.variantPick?.why && (
                    <p className="mt-2 text-xs leading-relaxed text-secondary">
                      <span className="font-600 text-ink">Why {chosenIdx === 0 ? "A" : "B"}:</span>{" "}
                      {cadence.variantPick.why}
                    </p>
                  )}
                </div>
              )}

              {/* Cadence timeline */}
              <div className="flex flex-col">
                {cadence.steps.map((step, i) => {
                  const meta = CHANNEL[step.channel];
                  const last = i === cadence.steps.length - 1;
                  return (
                    <div key={i} className="flex gap-3">
                      {/* Rail */}
                      <div className="flex flex-col items-center">
                        <div
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
                          style={{ background: meta.tint, color: meta.accent }}
                        >
                          <meta.Icon className="h-4 w-4" />
                        </div>
                        {!last && <div className="w-px flex-1 bg-border" />}
                      </div>
                      {/* Content */}
                      <div className={`flex-1 ${last ? "" : "pb-5"}`}>
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-sm font-700 text-ink">
                            {meta.label}
                          </span>
                          <span className="rounded-chip bg-page px-2 py-0.5 text-[11px] font-600 text-secondary">
                            Day {step.day}
                          </span>
                          {step.rationale && (
                            <span className="truncate text-xs text-muted">
                              · {step.rationale}
                            </span>
                          )}
                        </div>
                        {step.subject && (
                          <div className="mb-1 text-sm font-600 text-ink">
                            {step.subject}
                          </div>
                        )}
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-secondary">
                          {step.body}
                        </pre>
                      </div>
                    </div>
                  );
                })}
              </div>
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
            disabled={loading || !cadence}
            className="flex items-center gap-2 rounded-full bg-violet px-5 py-2 text-sm font-600 text-white hover:bg-violet-hover disabled:opacity-50"
          >
            <Copy className="h-4 w-4" /> Approve & copy
          </button>
        </div>
      </div>
    </div>
  );
}
