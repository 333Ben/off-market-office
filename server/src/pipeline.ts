// Agent pipeline (§10). Phase 2 covers: ingest → deterministic math → score.
// Match + enrich + draft arrive in Phase 3. Every Claude call is narrated to the
// console via events; any failure falls back to deterministic values.

import type {
  Cadence,
  CadenceStep,
  Company,
  Contact,
  Match,
  OutreachChannel,
  OutreachDraft,
  OutreachResult,
  Signal,
  SignalType,
  SignalSource,
} from "./types";
import {
  getCompany,
  getDb,
  saveDb,
  upsertMatch,
  addDraft,
  addCadence,
} from "./store";
import { emit } from "./events";
import { jsonCall, textCall, hasLLM } from "./llm";
import {
  SCORE_SYSTEM,
  scoreUser,
  MATCH_SYSTEM,
  OUTREACH_EMAIL_SYSTEM,
  OUTREACH_PHONE_SYSTEM,
  CADENCE_SYSTEM,
  cadenceUser,
} from "./prompts";
import { deskCapacity, monthsToBreach, neededSqm } from "./spacemath";
import { rankCandidates, computeFit, type Fit } from "./matcher";
import { MockEnrichmentProvider } from "./providers/enrichment/mock";
import { getEnrichmentProvider } from "./providers/enrichment/index";
import {
  getOutreachProvider,
  MockOutreachProvider,
  type OutreachTarget,
} from "./providers/outreach/index";

const mockEnrichment = new MockEnrichmentProvider();
const mockOutreach = new MockOutreachProvider();
let matchSeq = 0;
let draftSeq = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function mathNarration(c: Company): string {
  if (c.type === "outgrower") {
    const breach =
      c.monthsToBreach == null
        ? "already over capacity"
        : `breach in ~${c.monthsToBreach} mo`;
    return `${c.name}: ${c.headcount} people, hiring ${c.hiresPerMonth}/mo, ${c.capacityDesks} desks → ${breach}`;
  }
  return `${c.name}: headcount ${c.headcount} (was ${c.wasHeadcount}), releasing ${c.availableSqm} m² → ${c.releaseReason}`;
}

interface ScoreResult {
  urgencyScore: number;
  rationale: string;
  recommendedAction?: string;
}

/** Deterministic fallback used when the LLM is unavailable or errors. */
function fallbackScore(c: Company): ScoreResult {
  const base = Math.max(0, Math.min(100, c.urgencyScore));
  const rationale =
    c.type === "outgrower"
      ? `Hiring pace outruns desk capacity (${c.capacityDesks} desks, ${c.headcount} on staff).`
      : `${c.availableSqm} m² coming free — ${c.releaseReason} with ${c.motivation} motivation.`;
  return { urgencyScore: base, rationale };
}

/** Run math + Claude scoring for one company, emitting console events. */
export async function scoreCompany(c: Company): Promise<void> {
  emit("thinking", mathNarration(c), c.id);

  let result: ScoreResult;
  if (hasLLM()) {
    try {
      result = await jsonCall<ScoreResult>(SCORE_SYSTEM, scoreUser(c), 0.2);
      result.urgencyScore = Math.max(
        0,
        Math.min(100, Math.round(result.urgencyScore))
      );
    } catch (e) {
      emit("error", `Scoring failed for ${c.name} — using fallback`, c.id);
      result = fallbackScore(c);
    }
  } else {
    result = fallbackScore(c);
  }

  c.urgencyScore = result.urgencyScore;
  c.scoreRationale = result.rationale;
  if (c.status === "new") c.status = "scored";
  saveDb();

  emit(
    "score",
    `${c.name} scored ${result.urgencyScore}/100 — ${result.rationale}`,
    c.id
  );
}

/** Score every unscored company sequentially, paced so the console "types" (§10). */
export async function runAll(): Promise<void> {
  const db = getDb();
  const pending = db.companies.filter((c) => c.status === "new");
  emit("info", `Agent run: scoring ${pending.length} companies…`);
  for (const c of pending) {
    await scoreCompany(c);
    await sleep(300);
  }
  emit("info", "Agent run complete.");
}

let sigSeq = 1000;
function makeSignal(
  companyId: string,
  type: SignalType,
  source: SignalSource,
  title: string,
  detail: string,
  weight: number
): Signal {
  return {
    id: `sig-live-${++sigSeq}`,
    companyId,
    type,
    source,
    title,
    detail,
    timestamp: new Date().toISOString(),
    weight,
  };
}

/** Ingest a new signal, recompute math, re-score. Returns the company. */
export async function ingestSignal(company: Company, signal: Signal) {
  company.signals.unshift(signal);
  emit("signal", `${signal.title} — ${company.name} (${signal.source})`, company.id);

  // Recompute deterministic math so scoring sees fresh numbers.
  if (company.type === "outgrower") {
    company.capacityDesks = deskCapacity(company.officeSqm);
    company.monthsToBreach = monthsToBreach(
      company.capacityDesks,
      company.headcount,
      company.hiresPerMonth ?? 0
    );
    company.neededSqm = neededSqm(company.headcount, company.openRoles ?? 0);
  }
  saveDb();

  await scoreCompany(company);
  return company;
}

function maskEmail(email?: string): string {
  if (!email) return "—";
  const [user, domain] = email.split("@");
  return `${user[0]}${"•".repeat(Math.max(2, user.length - 1))}@${domain}`;
}
function maskPhone(phone?: string): string {
  if (!phone) return "—";
  return phone.replace(/\d(?=\d{2}\b)/g, "•");
}

/** Step 4 — enrichment via the EnrichmentProvider adapter (mock by default;
 *  real FullEnrich when PROVIDERS=fullenrich + key). Real failures fall back to
 *  mock so the flow never breaks. */
export async function enrichCompany(c: Company): Promise<Contact> {
  const target =
    c.type === "outgrower" ? "Head of Workplace" : "CFO / Office Manager";
  const { provider, real } = getEnrichmentProvider();
  emit(
    "tool_call",
    `FullEnrich${real ? "" : " (mock)"}: waterfall lookup for ${target} @ ${c.name}`,
    c.id
  );
  let contact: Contact;
  try {
    contact = await provider.enrich(c);
  } catch (e) {
    if (real) emit("error", `FullEnrich failed (${(e as Error).message}) — using mock`, c.id);
    contact = await mockEnrichment.enrich(c);
  }
  c.contact = contact;
  if (c.status === "new" || c.status === "scored") c.status = "enriched";
  saveDb();
  emit(
    "tool_result",
    `Found ${contact.fullName} (${contact.role}) — ${maskEmail(contact.email)} · ${maskPhone(contact.phone)}${contact.linkedin ? " · LinkedIn ✓" : ""}`,
    c.id
  );
  return contact;
}

/** Push an approved contact list to Max (mock by default; real MCP when
 *  PROVIDERS=max + token). Marks the companies "contacted" and narrates the
 *  console. Real failures fall back to mock so the flow never breaks. */
export async function launchOutreach(
  companyIds: string[],
  channel: OutreachChannel
): Promise<OutreachResult> {
  const companies = companyIds
    .map((id) => getCompany(id))
    .filter((c): c is Company => Boolean(c));

  const targets: OutreachTarget[] = companies.map((c) => ({
    companyId: c.id,
    companyName: c.name,
    contactName: c.contact?.fullName,
    role: c.contact?.role,
    email: c.contact?.email,
    phone: c.contact?.phone,
    linkedin: c.contact?.linkedin,
  }));
  const reachable = targets.filter((t) => t.email || t.linkedin || t.phone);
  const skipped = companies.length - reachable.length;

  const { provider, real } = getOutreachProvider();
  emit(
    "tool_call",
    `Max${real ? "" : " (mock)"}: launching ${channel} campaign for ${reachable.length} contact(s)`
  );

  let out;
  let usedReal = real;
  try {
    out = await provider.launch({ targets, channel, listName: "Outgrow list" });
  } catch (e) {
    emit("error", `Max failed (${(e as Error).message}) — using mock`);
    out = await mockOutreach.launch({ targets, channel });
    usedReal = false;
  }

  // Mark reachable companies contacted.
  const reachedIds = new Set(reachable.map((t) => t.companyId));
  for (const c of companies) {
    if (reachedIds.has(c.id)) c.status = "contacted";
  }
  saveDb();

  emit(
    "tool_result",
    `Max campaign ${out.campaignId} — ${out.queued} queued${skipped ? `, ${skipped} skipped (no contact)` : ""}`
  );

  return {
    ok: true,
    provider: "max",
    real: usedReal,
    campaignId: out.campaignId,
    channel,
    queued: out.queued,
    skipped,
    companyIds: reachable.map((t) => t.companyId),
    message: out.message,
  };
}

/** Create + persist a match for a specific outgrower/releaser pair (Claude rationale). */
async function buildMatch(
  out: Company,
  rel: Company,
  fit: Fit
): Promise<Match> {
  let rationale = `${rel.availableSqm} m² freeing up near ${out.name}'s ${out.arrondissement}e office fits its ~${out.neededSqm} m² need, and the timing lines up.`;
  if (hasLLM()) {
    try {
      const r = await jsonCall<{ rationale: string }>(
        MATCH_SYSTEM,
        `NEEDS SPACE — ${out.name} (${out.arrondissement}e): needs ~${out.neededSqm} m², breach in ${out.monthsToBreach ?? 0} months.
RELEASING — ${rel.name} (${rel.arrondissement}e): ${rel.availableSqm} m² available ${rel.availableFrom}, reason ${rel.releaseReason}.
Fit scores — overall ${fit.score}, size ${fit.sqmFit}, timing ${fit.timingFit}, location ${fit.locationFit}.`,
        0.2
      );
      if (r.rationale) rationale = r.rationale;
    } catch {
      emit("error", "Match rationale fell back to template", out.id);
    }
  }

  const match: Match = {
    id: `match-${++matchSeq}-${Date.now()}`,
    outgrowerId: out.id,
    releaserId: rel.id,
    score: fit.score,
    sqmFit: fit.sqmFit,
    timingFit: fit.timingFit,
    locationFit: fit.locationFit,
    rationale,
    status: "suggested",
  };
  const saved = upsertMatch(match);
  for (const co of [out, rel]) {
    if (!co.matchIds.includes(saved.id)) co.matchIds.push(saved.id);
    if (co.status !== "contacted") co.status = "matched";
  }
  saveDb();
  emit("match", `Match: ${out.name} ↔ ${rel.name} — ${fit.score}`, out.id);
  return saved;
}

/** Step 5 — pick the best counterpart and match it (used for live/ad-hoc signals). */
export async function matchCompany(c: Company): Promise<Match | null> {
  const db = getDb();
  const [best] = rankCandidates(c, db.companies);
  if (!best || best.score < 65) {
    emit("info", `No strong match for ${c.name} (best < 65).`, c.id);
    return null;
  }
  const [out, rel] =
    c.type === "outgrower" ? [c, best.company] : [best.company, c];
  return buildMatch(out, rel, best);
}

/** Step 6 — Claude-drafted outreach (email for demand, phone script for supply). */
export async function draftCompany(
  c: Company,
  channel: "email" | "phone_script",
  matchId?: string,
  lang: "en" | "fr" = "en"
): Promise<OutreachDraft> {
  const langNote =
    lang === "fr"
      ? "\n\nWrite the entire output in natural French (fr-FR)."
      : "";
  const facts =
    c.type === "outgrower"
      ? `${c.name}, ${c.industry}, ${c.arrondissement}e. Headcount ${c.headcount}, ${c.openRoles} open roles, hiring ${c.hiresPerMonth}/mo. Breach in ${c.monthsToBreach ?? 0} months, needs ~${c.neededSqm} m². Contact: ${c.contact?.fullName ?? "the decision-maker"} (${c.contact?.role ?? "Head of Workplace"}).`
      : `${c.name}, ${c.industry}, ${c.arrondissement}e. Releasing ${c.availableSqm} m² from ${c.availableFrom}, reason ${c.releaseReason}, motivation ${c.motivation}. Contact: ${c.contact?.fullName ?? "the decision-maker"}.`;

  let subject: string | undefined;
  let body: string;

  if (channel === "email") {
    subject =
      lang === "fr"
        ? `Des bureaux qui grandissent avec ${c.name}`
        : `Space that grows with ${c.name}`;
    body =
      lang === "fr"
        ? `Bonjour ${c.contact?.fullName?.split(" ")[0] ?? ""},\n\nFélicitations pour la dynamique chez ${c.name}. Avec ${c.openRoles} postes ouverts et environ ${c.monthsToBreach ?? 0} mois avant que vos bureaux du ${c.arrondissement}e n'atteignent leur capacité, il serait utile d'anticiper ~${c.neededSqm} m². J'ai une belle option à proximité.\n\nDisponible pour un court échange cette semaine ?\n\n[Your name]`
        : `Hi ${c.contact?.fullName?.split(" ")[0] ?? "there"},\n\nCongratulations on the momentum at ${c.name}. With ${c.openRoles} roles open and roughly ${c.monthsToBreach ?? 0} months before your ${c.arrondissement}e office runs out of desks, it may be worth lining up ~${c.neededSqm} m² now. I have a strong option nearby.\n\nOpen to a quick call this week?\n\n[Your name]`;
    if (hasLLM()) {
      try {
        const r = await jsonCall<{ subject: string; body: string }>(
          OUTREACH_EMAIL_SYSTEM + langNote,
          facts,
          0.7,
          700
        );
        subject = r.subject || subject;
        body = r.body || body;
      } catch {
        emit("error", `Email draft fell back for ${c.name}`, c.id);
      }
    }
  } else {
    body =
      lang === "fr"
        ? `Bonjour, ${"[Your name]"} — courtier en bureaux à Paris.\nJ'ai vu que ${c.name} libère environ ${c.availableSqm} m².\nJe travaille avec des équipes en croissance qui cherchent exactement cet espace.\nJe peux vous aider à le placer vite et en toute discrétion.\nEst-ce un mauvais moment pour deux minutes ?`
        : `Hi, this is [Your name] — a Paris office broker.\nI saw ${c.name} is freeing up around ${c.availableSqm} m².\nI work with growing teams looking for exactly that space.\nCould help you place it quickly and quietly.\nIs now a bad time for two minutes?`;
    if (hasLLM()) {
      try {
        const r = await textCall(OUTREACH_PHONE_SYSTEM + langNote, facts, 0.7, 400);
        // Phone system returns JSON {body}; parse defensively.
        try {
          const parsed = JSON.parse(
            r.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim()
          );
          if (parsed.body) body = parsed.body;
        } catch {
          if (r.trim()) body = r.trim();
        }
      } catch {
        emit("error", `Phone script fell back for ${c.name}`, c.id);
      }
    }
  }

  const draft: OutreachDraft = {
    id: `draft-${++draftSeq}-${Date.now()}`,
    companyId: c.id,
    matchId,
    channel,
    subject,
    body,
  };
  addDraft(draft);
  saveDb();
  emit(
    "draft",
    `Drafted ${channel === "email" ? "outreach email" : "phone script"} for ${c.name}`,
    c.id
  );
  return draft;
}

// ── Multi-channel cadence ─────────────────────────────────────────────────────
let cadenceSeq = 0;

interface CadenceShape {
  subjectVariants: string[];
  variantPick?: { choice: string; why: string };
  steps: CadenceStep[];
}

/** Deterministic 4-touch cadence — the offline-safe fallback and the scaffold
 *  Claude's copy is overlaid onto (fixed channels + days keep the UI stable). */
function fallbackCadence(c: Company, lang: "en" | "fr"): CadenceShape {
  const first = c.contact?.fullName?.split(" ")[0] ?? (lang === "fr" ? "" : "there");
  const fr = lang === "fr";

  if (c.type === "outgrower") {
    const mtb = c.monthsToBreach ?? 0;
    const subjectVariants = fr
      ? [`Des bureaux qui grandissent avec ${c.name}`, `Encore ~${mtb} mois de marge dans vos bureaux du ${c.arrondissement}e`]
      : [`Space that grows with ${c.name}`, `~${mtb} months of runway on your ${c.arrondissement}e office`];
    const steps: CadenceStep[] = [
      {
        channel: "email",
        day: 1,
        subject: subjectVariants[0],
        body: fr
          ? `Bonjour ${first},\n\nFélicitations pour la dynamique chez ${c.name}. Avec ${c.openRoles} postes ouverts et ~${mtb} mois avant que vos bureaux du ${c.arrondissement}e n'atteignent leur capacité, il serait utile d'anticiper ~${c.neededSqm} m². J'ai une belle option à proximité.\n\nDisponible pour un court échange cette semaine ?\n\n[Your name]`
          : `Hi ${first},\n\nCongratulations on the momentum at ${c.name}. With ${c.openRoles} roles open and ~${mtb} months before your ${c.arrondissement}e office runs out of desks, it may be worth lining up ~${c.neededSqm} m² now. I have a strong option nearby.\n\nOpen to a quick call this week?\n\n[Your name]`,
        rationale: fr ? "ouvre sur la dynamique d'embauche" : "opens on the hiring momentum",
      },
      {
        channel: "linkedin",
        day: 3,
        body: fr
          ? `Bonjour ${first}, j'ai vu que ${c.name} ouvre ${c.openRoles} postes — belle croissance. Les équipes qui recrutent à ce rythme saturent souvent leurs bureaux avant de l'anticiper. Ravi de partager une option proche dimensionnée pour ~${c.neededSqm} m² si utile.`
          : `Hi ${first}, saw ${c.name} is hiring for ${c.openRoles} roles — great growth. Teams moving this fast usually hit a desk wall before they plan for it. Happy to share a nearby option sized to ~${c.neededSqm} m² if useful.`,
        rationale: fr ? "angle rythme de recrutement" : "hiring-pace angle",
      },
      {
        channel: "phone",
        day: 5,
        body: fr
          ? `Bonjour, ${"[Your name]"} — courtier en bureaux à Paris.\nJe suis votre croissance chez ${c.name} de près.\nVos bureaux du ${c.arrondissement}e arrivent à saturation dans ~${mtb} mois.\nJ'ai un espace d'environ ${c.neededSqm} m² à proximité, dispo au bon moment.\nDeux minutes pour en parler ?`
          : `Hi, this is [Your name] — a Paris office broker.\nI've been tracking the growth at ${c.name}.\nYour ${c.arrondissement}e office runs out of desks in ~${mtb} months.\nI have ~${c.neededSqm} m² nearby, available right on time.\nGot two minutes to talk it through?`,
        rationale: fr ? "appel direct, propose l'espace" : "direct call, offers the space",
      },
      {
        channel: "email",
        day: 8,
        subject: fr ? `Toujours dispo : ~${c.neededSqm} m² près du ${c.arrondissement}e` : `Still open: ~${c.neededSqm} m² near the ${c.arrondissement}e`,
        body: fr
          ? `Bonjour ${first},\n\nJe reviens vers vous : l'option d'environ ${c.neededSqm} m² à proximité de vos bureaux est toujours disponible, mais elle intéresse d'autres équipes en croissance. Vu vos ${c.openRoles} recrutements en cours, elle collerait bien à votre trajectoire.\n\n15 minutes cette semaine pour la visiter ?\n\n[Your name]`
          : `Hi ${first},\n\nCircling back: the ~${c.neededSqm} m² option near your office is still available, but other growing teams are looking at it. Given your ${c.openRoles} open roles, it fits your trajectory well.\n\n15 minutes this week to walk it?\n\n[Your name]`,
        rationale: fr ? "relance douce + rareté" : "gentle nudge + scarcity",
      },
    ];
    return {
      subjectVariants,
      variantPick: {
        choice: subjectVariants[0],
        why: fr
          ? "Ouvre sur une réussite plutôt qu'un problème — ton plus chaleureux, meilleur taux de réponse."
          : "Leads on a win, not a problem — warmer open, better reply rate.",
      },
      steps,
    };
  }

  // Releaser (supply side) — respectful, discreet.
  const subjectVariants = fr
    ? [`Placer vos ${c.availableSqm} m² en toute discrétion`, `Des équipes en croissance cherchent un espace comme le vôtre`]
    : [`A quiet way to place your ${c.availableSqm} m²`, `Growing teams are looking for space like yours`];
  const steps: CadenceStep[] = [
    {
      channel: "email",
      day: 1,
      subject: subjectVariants[0],
      body: fr
        ? `Bonjour ${first},\n\nJe travaille avec des équipes en croissance à Paris et j'ai vu que ${c.name} libère environ ${c.availableSqm} m² (dispo dès ${c.availableFrom}). Je peux vous aider à le placer vite et discrètement, auprès de locataires sérieux.\n\nUn court échange cette semaine vous conviendrait ?\n\n[Your name]`
        : `Hi ${first},\n\nI work with growing teams in Paris and saw ${c.name} is freeing up around ${c.availableSqm} m² (available from ${c.availableFrom}). I can help you place it quickly and discreetly with serious tenants.\n\nWould a short call this week work?\n\n[Your name]`,
      rationale: fr ? "ouvre sur la discrétion" : "opens on discretion",
    },
    {
      channel: "linkedin",
      day: 3,
      body: fr
        ? `Bonjour ${first}, je me permets un mot au sujet des ~${c.availableSqm} m² du ${c.arrondissement}e. J'ai plusieurs équipes en croissance qui cherchent exactement ce format. Je peux gérer la mise en relation discrètement, à votre rythme.`
        : `Hi ${first}, reaching out about the ~${c.availableSqm} m² in the ${c.arrondissement}e. I have several growing teams looking for exactly this footprint. I can handle introductions discreetly, at your pace.`,
      rationale: fr ? "demande concrète prête" : "ready, concrete demand",
    },
    {
      channel: "phone",
      day: 5,
      body: fr
        ? `Bonjour, ${"[Your name]"} — courtier en bureaux à Paris.\nJ'ai vu que ${c.name} libère environ ${c.availableSqm} m².\nJe travaille avec des équipes en croissance qui cherchent exactement cet espace.\nJe peux vous aider à le placer vite et en toute discrétion.\nEst-ce un mauvais moment pour deux minutes ?`
        : `Hi, this is [Your name] — a Paris office broker.\nI saw ${c.name} is freeing up around ${c.availableSqm} m².\nI work with growing teams looking for exactly that space.\nCould help you place it quickly and quietly.\nIs now a bad time for two minutes?`,
      rationale: fr ? "appel direct et respectueux" : "direct, respectful call",
    },
    {
      channel: "email",
      day: 8,
      subject: fr ? `Toujours à l'écoute pour vos ${c.availableSqm} m²` : `Still happy to help with your ${c.availableSqm} m²`,
      body: fr
        ? `Bonjour ${first},\n\nJe reste à disposition pour vos ~${c.availableSqm} m² dès que le timing vous convient (dispo ${c.availableFrom}). Aucune pression — je peux préparer une short-list de locataires en amont pour que tout aille vite le moment venu.\n\nJe vous laisse me dire.\n\n[Your name]`
        : `Hi ${first},\n\nStill glad to help place your ~${c.availableSqm} m² whenever the timing suits (available ${c.availableFrom}). No pressure — I can line up a short-list of tenants ahead of time so it moves fast when you're ready.\n\nOver to you.\n\n[Your name]`,
      rationale: fr ? "relance sans pression" : "no-pressure follow-up",
    },
  ];
  return {
    subjectVariants,
    variantPick: {
      choice: subjectVariants[0],
      why: fr
        ? "Met en avant la discrétion, ce qui rassure une entreprise en difficulté."
        : "Leads on discretion, which reassures a company in a hard moment.",
    },
    steps,
  };
}

/** Multi-channel cadence: one Claude call plans the whole sequence; its copy is
 *  overlaid on a fixed 4-touch scaffold so the timeline is always well-formed. */
export async function buildCadence(
  c: Company,
  matchId?: string,
  lang: "en" | "fr" = "en"
): Promise<Cadence> {
  const base = fallbackCadence(c, lang);
  let { subjectVariants, variantPick, steps } = base;

  if (hasLLM()) {
    const langNote =
      lang === "fr" ? "\n\nWrite the entire output in natural French (fr-FR)." : "";
    try {
      const r = await jsonCall<CadenceShape>(
        CADENCE_SYSTEM + langNote,
        cadenceUser(c),
        0.7,
        2000
      );
      if (Array.isArray(r.steps) && r.steps.length) {
        // Overlay Claude's words onto the fixed channel/day scaffold, per index.
        steps = base.steps.map((s, i) => {
          const rs = r.steps[i];
          if (!rs) return s;
          return {
            channel: s.channel,
            day: s.day,
            subject: s.channel === "email" ? rs.subject?.trim() || s.subject : undefined,
            body: rs.body?.trim() || s.body,
            rationale: rs.rationale?.trim() || s.rationale,
          };
        });
      }
      if (Array.isArray(r.subjectVariants) && r.subjectVariants.length >= 2) {
        subjectVariants = r.subjectVariants.slice(0, 2).map((v) => v.trim());
      }
      if (r.variantPick?.choice && r.variantPick.why) variantPick = r.variantPick;
    } catch {
      emit("error", `Cadence fell back to template for ${c.name}`, c.id);
    }
  }

  // Keep the lead email's subject consistent with the A/B pick.
  const chosen = variantPick?.choice;
  if (chosen) {
    const lead = steps.find((s) => s.channel === "email");
    if (lead) lead.subject = chosen;
  }

  const cadence: Cadence = {
    id: `cadence-${++cadenceSeq}-${Date.now()}`,
    companyId: c.id,
    matchId,
    lang,
    subjectVariants,
    variantPick,
    steps,
  };
  addCadence(cadence);
  if (c.status !== "contacted") c.status = "matched";
  saveDb();
  emit(
    "draft",
    `Drafted ${steps.length}-touch cadence (email→LinkedIn→call) for ${c.name}`,
    c.id
  );
  return cadence;
}

/** Scripted hero sequence (§13): signal → math → score → enrich → match → draft. */
export async function simulateHero() {
  const hero = getCompany("hero-out");
  if (!hero) {
    emit("error", "Hero company hero-out not found");
    return;
  }
  // A sharper hiring spike pushes the breach window in and the score up.
  hero.headcount = Math.max(hero.headcount, 33);
  hero.hiresPerMonth = 5.5;
  hero.openRoles = 22;
  const signal = makeSignal(
    hero.id,
    "hiring_surge",
    "sillage",
    "Hiring spike: 6 more roles in 7 days",
    "Sudden acceleration across engineering and GTM.",
    75
  );
  await ingestSignal(hero, signal); // ingest + math + score
  await sleep(500);
  await enrichCompany(hero);
  await sleep(500);

  // Scripted hero match (§13): the intended Cartesia Labs ↔ Atelier Numérique pair.
  const atelier = getCompany("hero-rel");
  const match = atelier
    ? await buildMatch(hero, atelier, computeFit(hero, atelier))
    : await matchCompany(hero);
  await sleep(500);

  await buildCadence(hero, match?.id);
  if (match) {
    const rel = getCompany(match.releaserId);
    if (rel) {
      await sleep(400);
      await buildCadence(rel, match.id);
    }
  }
  emit("info", "Hero sequence complete — two multi-channel cadences ready for review.");
}
