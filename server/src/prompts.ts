// All Claude prompts (§10). Scoring/matching must return JSON only — the server
// strips fences defensively before JSON.parse. Outreach is prose.

import type { Company } from "./types";

const SIGNAL_LINE = (c: Company) =>
  c.signals
    .map((s) => `- [${s.source}] ${s.title}: ${s.detail}`)
    .join("\n") || "- (no signals yet)";

// ── Scoring ────────────────────────────────────────────────────────────────
export const SCORE_SYSTEM = `You are an analyst for a Paris commercial real-estate brokerage. You score how urgently a company is a broker opportunity, on a 0–100 scale.

- Outgrowers (demand): hiring faster than their office can hold. Sooner breach + strong hiring/exec signals = higher score.
- Releasers (supply): shrinking, insolvent, relocating, or going remote. Confirmed insolvency, imminent availability, and champion exodus = higher score.

The capacity math is already computed and correct — trust it; do not recompute. Weigh signals and timing.

Return ONLY minified JSON, no prose, no markdown fences:
{"urgencyScore": <int 0-100>, "rationale": "<1-2 sentences>", "recommendedAction": "<short imperative>"}`;

export function scoreUser(c: Company): string {
  if (c.type === "outgrower") {
    const breach =
      c.monthsToBreach == null
        ? "already over capacity"
        : `~${c.monthsToBreach} months to breach`;
    return `OUTGROWER — ${c.name} (${c.industry}, ${c.arrondissement}e Paris)
Headcount ${c.headcount}, ${c.openRoles} open roles, hiring ${c.hiresPerMonth}/month.
Office ${c.officeSqm} m² (~${c.capacityDesks} desks). Computed: ${breach}, will need ~${c.neededSqm} m².
Signals:
${SIGNAL_LINE(c)}`;
  }
  return `RELEASER — ${c.name} (${c.industry}, ${c.arrondissement}e Paris)
Headcount ${c.headcount} (was ${c.wasHeadcount}). Reason: ${c.releaseReason}.
Releasing ${c.availableSqm} m², available from ${c.availableFrom}. Motivation: ${c.motivation}.
Signals:
${SIGNAL_LINE(c)}`;
}

// ── Match rationale ──────────────────────────────────────────────────────────
export const MATCH_SYSTEM = `You are a Paris commercial real-estate broker. Given one company that needs office space and one releasing it, plus computed fit scores, write a crisp 2–3 sentence rationale a broker could act on. Cite the concrete numbers (m², timing, arrondissements). Return ONLY JSON, no fences:
{"rationale": "<2-3 sentences>"}`;

// ── Outreach ────────────────────────────────────────────────────────────────
export const OUTREACH_EMAIL_SYSTEM = `You write outreach emails for a Paris commercial real-estate broker. Tone: congratulate-then-help, warm and specific, never salesy. 90–120 words. Cite at least two concrete facts from the data. One clear call to action. No placeholder brackets except [Your name]. Return ONLY JSON, no fences:
{"subject": "<subject line>", "body": "<email body>"}`;

export const OUTREACH_PHONE_SYSTEM = `You write a 5-line phone script for a Paris commercial real-estate broker calling a company that is releasing office space. Warm, direct, respects that they may be in a hard moment (downsizing/insolvency). Cite the available m² and timing. Return ONLY JSON, no fences:
{"body": "<5 short lines separated by newlines>"}`;
