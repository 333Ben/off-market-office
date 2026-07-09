import { useState } from "react";
import { X, Send } from "lucide-react";
import type { Company } from "../types";
import { useStore } from "../store";
import {
  typeColor,
  typeLabel,
  formatDate,
  releaseReasonLabel,
  weeksUntil,
} from "../lib/format";
import UrgencyRing from "./UrgencyRing";
import SignalTimeline from "./SignalTimeline";
import ContactBlock from "./ContactBlock";
import MatchList from "./MatchList";
import OutreachModal from "./OutreachModal";

export default function DetailPanel({ company }: { company: Company }) {
  const setSelected = useStore((s) => s.setSelected);
  const color = typeColor(company);
  const isOut = company.type === "outgrower";
  const [outreachOpen, setOutreachOpen] = useState(false);

  return (
    <div className="flex h-full w-[380px] flex-col overflow-y-auto bg-card">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-border bg-card px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-block rounded-chip px-2 py-0.5 text-[11px] font-600"
              style={{
                background: isOut ? "var(--violet-tint)" : "var(--coral-tint)",
                color,
              }}
            >
              {typeLabel(company)}
            </span>
            {company.origin === "bodacc" && (
              <span className="rounded-chip bg-success/10 px-1.5 py-0.5 text-[10px] font-700 text-success">
                LIVE · BODACC public record
              </span>
            )}
          </div>
          <h2 className="truncate text-lg font-700 text-ink">{company.name}</h2>
          <p className="text-sm text-secondary">
            {company.industry} · {company.arrondissement}e · Paris
          </p>
          <p className="mt-0.5 text-xs text-muted">{company.address}</p>
        </div>
        <button
          onClick={() => setSelected(null)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-chip text-muted hover:bg-page hover:text-ink"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-5 p-5">
        {/* Urgency + rationale */}
        <div className="flex items-center gap-4 rounded-card border border-border bg-page p-4">
          <UrgencyRing value={company.urgencyScore} color={color} size={88} />
          <div className="min-w-0">
            <div className="text-xs font-600 uppercase tracking-wide text-muted">
              Urgency
            </div>
            <p className="mt-1 text-sm text-secondary">
              {company.scoreRationale ??
                (isOut
                  ? "Hiring pace is outrunning desk capacity."
                  : "Space is coming free and the motivation to move is real.")}
            </p>
          </div>
        </div>

        {/* Metric grid 2×2 */}
        <div className="grid grid-cols-2 gap-3">
          {isOut ? (
            <>
              <Metric label="Headcount" value={company.headcount} />
              <Metric label="Open roles" value={company.openRoles ?? 0} />
              <Metric label="Office" value={`${company.officeSqm}`} unit="m²" />
              <BreachMetric company={company} />
            </>
          ) : (
            <>
              <Metric
                label="Headcount"
                value={company.headcount}
                sub={
                  company.wasHeadcount
                    ? `was ${company.wasHeadcount}`
                    : undefined
                }
              />
              <Metric
                label="Available"
                value={`${company.availableSqm}`}
                unit="m²"
                accent={color}
              />
              <Metric
                label="Available from"
                value={
                  company.availableFrom
                    ? `${weeksUntil(company.availableFrom)}`
                    : "—"
                }
                unit="wks"
                sub={
                  company.availableFrom
                    ? formatDate(company.availableFrom)
                    : undefined
                }
              />
              <Metric
                label="Reason"
                value={releaseReasonLabel(company.releaseReason)}
                small
              />
            </>
          )}
        </div>

        {/* Callout line */}
        {isOut ? (
          <div className="rounded-card bg-violet-tint px-4 py-3 text-sm text-ink">
            Needs <b className="tnum">~{company.neededSqm} m²</b> · current
            capacity <b className="tnum">{company.capacityDesks}</b> desks
          </div>
        ) : (
          <div className="rounded-card bg-coral-tint px-4 py-3 text-sm text-ink">
            Motivation to move:{" "}
            <b className="capitalize">{company.motivation}</b>
          </div>
        )}

        {company.estimated && (
          <p className="-mt-2 text-[11px] leading-snug text-muted">
            Office size, headcount and availability are <b>estimated</b>. The
            company name, arrondissement, filing type and date are from the real
            BODACC public record.
          </p>
        )}

        {/* Signals */}
        <section>
          <h3 className="mb-3 text-xs font-600 uppercase tracking-wide text-muted">
            Signals
          </h3>
          <SignalTimeline signals={company.signals} />
        </section>

        <ContactBlock company={company} />
        <MatchList company={company} />
      </div>

      {/* Primary CTA */}
      <div className="sticky bottom-0 border-t border-border bg-card p-4">
        <button
          onClick={() => setOutreachOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-violet px-4 py-2.5 text-sm font-600 text-white hover:bg-violet-hover"
        >
          <Send className="h-4 w-4" />
          Draft cadence
        </button>
        {company.status === "contacted" && (
          <p className="mt-2 text-center text-xs font-600 text-success">
            ✓ Outreach copied — status: contacted
          </p>
        )}
      </div>

      {outreachOpen && (
        <OutreachModal
          company={company}
          onClose={() => setOutreachOpen(false)}
        />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  sub,
  accent,
  small,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  accent?: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-card border border-border bg-card p-3">
      <div className="text-xs font-500 text-muted">{label}</div>
      <div
        className={`tnum mt-1 font-700 leading-tight ${small ? "text-lg" : "text-2xl"}`}
        style={accent ? { color: accent } : undefined}
      >
        {value}
        {unit && <span className="ml-1 text-sm font-600 text-secondary">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

function BreachMetric({ company }: { company: Company }) {
  const m = company.monthsToBreach;
  const over = m == null;
  const hot = m != null && m <= 3;
  return (
    <div className="rounded-card border border-border bg-card p-3">
      <div className="text-xs font-500 text-muted">Months to breach</div>
      {over ? (
        <div className="mt-1 text-lg font-700 leading-tight text-coral">
          Over capacity
        </div>
      ) : (
        <div
          className="tnum mt-1 text-2xl font-700 leading-tight"
          style={{ color: hot ? "var(--coral)" : "var(--ink)" }}
        >
          {m}
          <span className="ml-1 text-sm font-600 text-secondary">mo</span>
        </div>
      )}
    </div>
  );
}
