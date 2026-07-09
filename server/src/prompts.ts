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

// ── Multi-channel cadence ────────────────────────────────────────────────────
export const CADENCE_SYSTEM = `You plan a 4-touch, multi-channel outreach cadence for a Paris commercial real-estate broker. The steps are fixed, in this order: (1) email on day 1, (2) LinkedIn message on day 3, (3) phone call on day 5, (4) email on day 8.

Rules:
- Personalize every touch on a DIFFERENT concrete fact from the data (a specific signal, the m², the timing, the headcount/roles). Never repeat the same argument twice across touches.
- Tone: congratulate-then-help for a growing company; respectful and discreet for one downsizing, relocating, or in insolvency. Warm and specific, never salesy.
- Lengths: emails 90–120 words; LinkedIn note 55 words max; phone = exactly 5 short lines separated by newlines.
- One clear call to action per touch. No placeholder brackets except [Your name].
- Also propose two subject-line variants (A/B) for the lead email and say which you would lead with and why — reason about what earns a reply, do not claim any test result.

Return ONLY minified JSON, no prose, no markdown fences:
{"subjectVariants":["<variant A>","<variant B>"],"variantPick":{"choice":"<the exact chosen subject line, copied from a variant>","why":"<one sentence>"},"steps":[{"channel":"email","day":1,"subject":"<the chosen subject>","body":"<...>","rationale":"<which fact this touch leads on, max 8 words>"},{"channel":"linkedin","day":3,"body":"<...>","rationale":"<...>"},{"channel":"phone","day":5,"body":"<5 lines>","rationale":"<...>"},{"channel":"email","day":8,"subject":"<...>","body":"<...>","rationale":"<...>"}]}`;

export function cadenceUser(c: Company): string {
  if (c.type === "outgrower") {
    const breach =
      c.monthsToBreach == null
        ? "already over desk capacity"
        : `~${c.monthsToBreach} months to breach`;
    return `DEMAND SIDE — this company is outgrowing its office; help it secure space early.
${c.name} (${c.industry}, ${c.arrondissement}e Paris). Headcount ${c.headcount}, ${c.openRoles} open roles, hiring ${c.hiresPerMonth}/month. Office ${c.officeSqm} m² (~${c.capacityDesks} desks). Computed: ${breach}, will need ~${c.neededSqm} m².
Decision-maker: ${c.contact?.fullName ?? "the decision-maker"} (${c.contact?.role ?? "Head of Workplace"}).
Signals:
${SIGNAL_LINE(c)}`;
  }
  return `SUPPLY SIDE — this company is releasing office space; help it place the space quietly.
${c.name} (${c.industry}, ${c.arrondissement}e Paris). Headcount ${c.headcount} (was ${c.wasHeadcount}). Reason: ${c.releaseReason}, motivation ${c.motivation}. Releasing ${c.availableSqm} m², available from ${c.availableFrom}.
Decision-maker: ${c.contact?.fullName ?? "the decision-maker"} (${c.contact?.role ?? "CFO / Office Manager"}).
Signals:
${SIGNAL_LINE(c)}`;
}
