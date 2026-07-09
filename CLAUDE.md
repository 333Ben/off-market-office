# OUTGROW — Hackathon MVP Specification

> **Instructions for Claude Code:** You are building this project from scratch, alone, under hackathon time pressure. Read this entire file before writing any code. Build in the exact phase order defined in §14 — each phase ends with a GATE (a working, demoable state). Stop after each gate, print run instructions, and wait for confirmation before continuing. Never invent external API schemas: every external service sits behind an adapter with a `mock` implementation that is the default. Real providers are wired only when the human supplies keys and confirms the docs.

---

## 1. One-liner

**Outgrow turns hiring data into square meters.** It is an AI agent for commercial real estate brokers in Paris that detects companies about to *outgrow* their office (demand side), detects companies about to *release* their office (supply side — downsizing, insolvency, relocation), matches the two on a live map, and drafts the outreach for both — before either company has called a broker.

## 2. Context: this is a hackathon build

- **Event:** Agentic GTM Hackathon (Anthropic × FullEnrich × Sillage), Station F, Paris — one day.
- **Hard deadline:** project submission **17:30**, pitch 18:00. A 2-minute demo video must also be recorded before submission.
- **Judging (100 pts):** business impact (25), depth of Anthropic/AI use (25), depth of external data use — FullEnrich & Sillage (25), presentation (25). Every build decision should serve one of these four.
- **Demo reliability beats feature count.** Deterministic math in code; Claude for judgment, language, and reasoning. The demo must never depend on a flaky external call — mock adapters are a feature, not a shortcut.
- **Compliance:** all companies, people, and contact details in the demo dataset are **synthetic/fictional** (hackathon rules: "never use data without consent"). Real APIs are integrated to prove the pipeline works, but the on-stage demo runs on the synthetic dataset. Show a small footer note: `Demo data is synthetic`.

## 3. The concept

Two populations of Paris companies, one map:

| | **Outgrowers** (demand) | **Releasers** (supply) |
|---|---|---|
| Who | Companies hiring faster than their office can absorb | Companies shrinking, insolvent, relocating, or going remote |
| Key signals | Hiring surge, new exec hire (COO / Head of Workplace), champion/job-change signals | Insolvency filing, layoffs, champion exodus, office listing |
| Signal source (real world) | **Sillage** (hiring intent, job changes, champion tracking) | **BODACC** — France's official open registry of insolvency proceedings (free public API) + Sillage job-change/exodus clues |
| Agent output | Months-until-office-breach, urgency score, decision-maker contact (via **FullEnrich**), outreach draft | Available m², availability date, motivation level, decision-maker contact (via **FullEnrich**), outreach draft |

**The matcher** pairs hot Outgrowers with compatible Releasers (size fit, timing fit, location fit) and Claude writes a human-readable rationale plus outreach drafts for both sides. A match renders as an **animated arc between the two pins on the map** — this is the demo's signature moment.

**The human stays in the loop:** the agent drafts and recommends; a broker approves. No message is "sent" anywhere in the MVP.

## 4. Architecture

```
┌────────────────────────────────────────────────────────────┐
│  CLIENT  (React + Vite + Tailwind, Leaflet map)            │
│  Map · Sidebar filters · Detail panel · Agent console      │
│  ◄── SSE stream of AgentEvents ── REST for data/actions    │
└──────────────────────────┬─────────────────────────────────┘
                           │
┌──────────────────────────┴─────────────────────────────────┐
│  SERVER  (Node 20 + Express + TypeScript, in-memory store  │
│           persisted to /server/data/db.json)               │
│                                                            │
│  Signal ingest ─► Agent pipeline (Claude) ─► Store ─► SSE  │
│                                                            │
│  Adapters (interface + mock default + real impl):          │
│   · SignalProvider      (mock ✓ | sillage | bodacc)        │
│   · EnrichmentProvider  (mock ✓ | fullenrich)              │
│   · LLM                 (anthropic — real from phase 2)    │
└────────────────────────────────────────────────────────────┘
```

Single repo, two workspaces: `/client` and `/server`. No database, no auth, no deployment target beyond `localhost` — it is demoed from a laptop.

## 5. Tech stack (fixed — do not substitute)

- **Frontend:** React 18 + TypeScript + Vite, Tailwind CSS, `react-leaflet` + Leaflet with **CARTO Positron light tiles** (`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`, attribution required, no API key). Icons: `lucide-react`. State: `zustand`.
- **Backend:** Node 20, Express, TypeScript, `@anthropic-ai/sdk`. Persistence: plain JSON file read/write (no lowdb needed).
- **LLM:** Anthropic API, model `claude-sonnet-4-6` for all calls. Low temperature (0.2) for scoring/matching, 0.7 for outreach copy. Scoring and matching calls must instruct the model to return **JSON only** (no prose, no markdown fences) and the server must strip fences defensively before `JSON.parse`.
- **Streaming:** Server-Sent Events on `GET /api/events`.

## 6. Repo structure

```
outgrow/
  CLAUDE.md                  ← this file
  package.json               ← workspaces: client, server; root scripts: dev, seed
  .env.example               ← ANTHROPIC_API_KEY=, FULLENRICH_API_KEY=, SILLAGE_API_KEY=, PROVIDERS=mock
  client/
    src/
      main.tsx  App.tsx
      store.ts               ← zustand: companies, matches, events, filters, selection
      lib/api.ts             ← REST + SSE client
      components/
        TopBar.tsx  Sidebar.tsx  MapView.tsx  CompanyPin.tsx
        DetailPanel.tsx  SignalTimeline.tsx  ContactBlock.tsx
        MatchArc.tsx  MatchList.tsx  OutreachModal.tsx
        AgentConsole.tsx  UrgencyRing.tsx  Toast.tsx
      styles/tokens.css      ← design tokens from §12
  server/
    src/
      index.ts               ← Express app, routes, SSE hub
      store.ts               ← in-memory store + JSON persistence
      seed.ts                ← generates synthetic dataset (§8)
      pipeline.ts            ← signal → score → enrich → match → draft
      matcher.ts             ← deterministic match math
      spacemath.ts           ← deterministic capacity math
      prompts.ts             ← all Claude system/user prompts
      llm.ts                 ← Anthropic wrapper (json mode helper, event emission)
      providers/
        signals/  mock.ts  sillage.ts  bodacc.ts   (interface SignalProvider)
        enrichment/  mock.ts  fullenrich.ts        (interface EnrichmentProvider)
    data/db.json
```

## 7. Data models (shared shapes — mirror in client and server)

```ts
type CompanyType = "outgrower" | "releaser";

interface Company {
  id: string;
  name: string;                  // fictional
  type: CompanyType;
  industry: string;
  arrondissement: number;        // 1–20
  address: string;               // fictional street, real arrondissement
  lat: number; lng: number;      // within Paris: lat 48.83–48.90, lng 2.28–2.41
  headcount: number;
  officeSqm: number;
  capacityDesks: number;         // ≈ officeSqm / 10
  // outgrower only
  openRoles?: number;
  hiresPerMonth?: number;
  monthsToBreach?: number | null;   // computed, null = already over capacity
  neededSqm?: number;               // computed
  // releaser only
  releaseReason?: "insolvency" | "downsizing" | "relocation" | "remote_shift";
  availableSqm?: number;
  availableFrom?: string;           // ISO date
  motivation?: "urgent" | "high" | "moderate";
  // agent state
  urgencyScore: number;             // 0–100, Claude-assigned
  scoreRationale?: string;          // 1–2 sentences from Claude
  status: "new" | "scored" | "enriched" | "matched" | "contacted";
  signals: Signal[];
  contact?: Contact;
  matchIds: string[];
}

interface Signal {
  id: string; companyId: string;
  type: "hiring_surge" | "exec_hire" | "job_change" | "champion_departure"
      | "layoffs" | "insolvency_filing" | "office_listing";
  source: "sillage" | "bodacc" | "mock";
  title: string;                 // "Posted 12 engineering roles in 30 days"
  detail: string;
  timestamp: string;
  weight: number;                // -100..100 contribution to urgency
}

interface Contact {
  fullName: string; role: string;          // COO, CFO, Head of Workplace, Office Manager
  email?: string; phone?: string;          // fictional (@example.fr, +33 1 00 …)
  enrichmentStatus: "pending" | "found" | "partial";
  source: "fullenrich" | "mock";
}

interface Match {
  id: string;
  outgrowerId: string; releaserId: string;
  score: number;                 // 0–100 composite
  sqmFit: number; timingFit: number; locationFit: number;   // 0–100 each, deterministic
  rationale: string;             // Claude-written, 2–3 sentences
  status: "suggested" | "approved";
}

interface OutreachDraft {
  id: string; companyId: string; matchId?: string;
  channel: "email" | "phone_script";
  subject?: string; body: string;
}

interface AgentEvent {          // what streams into the console
  id: string; timestamp: string;
  kind: "signal" | "thinking" | "tool_call" | "tool_result"
      | "score" | "match" | "draft" | "error" | "info";
  message: string;              // one console line, human-readable
  companyId?: string;
}
```

## 8. Synthetic dataset (seed.ts)

Generate **28 companies**: 16 outgrowers, 12 releasers, spread across arrondissements (cluster realistically: startups in 2e/3e/9e/10e/11e, agencies in 2e/8e, corporates in 8e/9e/12e/13e/15e, La Défense excluded — stay intra-muros). **All names fictional** — plausible French/tech names ("Nexolane", "Atelier Numérique Group", "Cartesia Labs", "Maison Verdier"). Never use real company names. Contacts use `@example.fr` emails and `+33 1 00 xx xx xx` phones.

**Numbers must be coherent** — enforce with `spacemath.ts`, never let Claude invent them:

```
capacityDesks    = round(officeSqm / 10)          // French norm ≈ 10 m²/person
monthsToBreach   = hiresPerMonth > 0
                   ? max(0, (capacityDesks - headcount) / hiresPerMonth)
                   : null                          // null also when headcount ≥ capacity → "over capacity"
neededSqm        = round((headcount + openRoles * 0.7) * 10 / 10) * 10
```

Distribute urgency: ~5 companies red-hot (breach ≤ 3 months or insolvency filed), ~10 warm, rest background. Each company gets 1–4 signals with timestamps spread over the last 60 days.

**Hero pair (hard-code, used in the pitch):**
- `hero-out` — **"Cartesia Labs"**, AI infra scale-up, 11e (near Bastille), headcount 31, office 400 m² (capacity 40), 18 open roles, 4.5 hires/month → breach in ~2 months, needs ~440 m². Signals: hiring_surge (sillage), exec_hire "New Head of Workplace joined" (sillage).
- `hero-rel` — **"Atelier Numérique Group"**, ad agency, 3e (Sentier edge), headcount 12 (was 55), releasing **520 m²**, available in 6 weeks, reason `insolvency`. Signals: insolvency_filing "Redressement judiciaire published" (bodacc), champion_departure ×2 (sillage), layoffs.
- Their match must compute to score ≈ 90+ (520 vs 440 m² fit, timing aligns, 11e↔3e close).

Seed runs on server boot if `db.json` is missing; `POST /api/simulate/reset` re-seeds (demo safety).

## 9. External integrations — adapter rules

**Golden rule: DO NOT invent endpoint paths, auth schemes, or response shapes for Sillage or FullEnrich.** Their real docs are consulted by the human at integration time:
- FullEnrich API docs: `https://docs.fullenrich.com/api/v2/general/introduction` — API keys from `https://app.fullenrich.com/app/api`. Note: FullEnrich waterfall enrichment may be **asynchronous** (job + polling/webhook) — design `EnrichmentProvider.enrich(company): Promise<Contact>` so the real impl can poll internally while the mock resolves after a fake 1.5 s delay (the delay makes the demo feel real).
- Sillage: docs not yet published. `SignalProvider` exposes `start(onSignal: (s: Signal) => void)`; mock impl emits nothing by default (signals come from seed + simulate endpoint).
- BODACC (optional, phase 5 only): public OpenDataSoft API at `bodacc-datadila.opendatasoft.com` — real French insolvency records. If wired, fetch a handful of recent Paris `procédures collectives` and display them in a separate "live feed" toggle, clearly separated from the synthetic demo set.

`PROVIDERS=mock` in `.env` keeps everything mocked. Missing keys must never crash the app — log a console warning and fall back to mock.

## 10. The agent pipeline (where the Anthropic points are earned)

Triggered per company on seed-processing, and live when a signal arrives via `POST /api/simulate/signal`:

1. **Ingest** — attach signal to company, emit `AgentEvent{kind:"signal"}`.
2. **Deterministic math** — run `spacemath.ts`, emit `thinking` event narrating the numbers ("31 people, hiring 4.5/mo, 40 desks → breach in ~2 months").
3. **Score (Claude, JSON mode)** — input: company facts + signals + computed math. Output: `{ urgencyScore: number, rationale: string, recommendedAction: string }`. Emit `score` event; update pin size/pulse on client.
4. **Enrich** — if `urgencyScore ≥ 70` and no contact: call `EnrichmentProvider`, emit `tool_call` ("FullEnrich: waterfall lookup for Head of Workplace @ Cartesia Labs") then `tool_result` with masked email/phone reveal.
5. **Match (deterministic + Claude)** — `matcher.ts` computes candidates:
   - `sqmFit = 100 - min(100, |availableSqm - neededSqm| / neededSqm * 100)`
   - `timingFit`: overlap of `availableFrom` vs breach window (100 if available before breach, decays after)
   - `locationFit`: 100 same arrondissement, −12 per arrondissement-distance step (floor 20); use haversine as tiebreak
   - `score = 0.45*sqmFit + 0.35*timingFit + 0.20*locationFit`
   - Top candidate with score ≥ 65 → ask Claude for a 2–3 sentence rationale, create `Match`, emit `match` event → client draws the arc + toast.
6. **Draft (Claude)** — outreach for the outgrower's decision-maker (email, 90–120 words, must cite ≥ 2 concrete facts from signals/math, congratulate-then-help tone, single clear CTA, no placeholder brackets except `[Your name]`) and a 5-line phone script for the releaser side. Emit `draft` events.

All Claude calls go through `llm.ts`, which emits `thinking` events with a one-line summary of what it is asking (never dump raw prompts to the console — keep console lines short and legible from stage distance).

`POST /api/agent/run` processes all unscored companies sequentially (used once after seeding); pace events with ~300 ms gaps so the console visibly "types."

## 11. Backend API

```
GET  /api/companies?type=&minUrgency=&arrondissements=&signalTypes=
GET  /api/companies/:id                       // includes signals, contact, matches, drafts
POST /api/companies/:id/enrich
POST /api/companies/:id/draft   {channel}
GET  /api/matches
POST /api/matches/:id/approve
GET  /api/events                              // SSE
POST /api/agent/run
POST /api/simulate/signal      {companyId?}   // no body → fires the hero story (§13)
POST /api/simulate/reset
```

## 12. Frontend spec — design system and layout

The visual direction is **fixed** by the reference the human chose: a light, airy real-estate map platform. Follow it exactly; do not restyle toward dark/brutalist/serif defaults.

**Tokens (`tokens.css`):**
- Page background `#F6F6F8`; cards/panels `#FFFFFF`; borders `#ECECF1`
- Ink `#17171F`; secondary text `#6B7280`; muted `#9CA3AF`
- **Primary violet `#7C5CFC`** (buttons, active filter chips, outgrower pins, links); hover `#6A4BEF`; soft tint `#F1EDFF`
- **Releaser coral `#FF6B5E`**; soft tint `#FFEFED`
- Success `#22C55E`; warning `#F59E0B`
- Radii: cards 16 px, panels 20 px, chips 10 px, buttons pill or 12 px
- Shadow: `0 8px 24px rgba(23,23,31,0.08)`
- Font: **Inter** (Google Fonts), weights 400/500/600/700. Numbers in metric cards use `font-variant-numeric: tabular-nums`, weight 700, larger size — the numbers ARE the product, let them carry the personality.
- Map tiles: CARTO Positron (light gray — matches the reference aesthetic).

**Layout (desktop only, 1440 px target — this demos on a laptop + projector):**

```
┌──────────────────────────────────────────────────────────────┐
│ TopBar: ◆ Outgrow   [All | Need space | Releasing]  🔍search │
│                                        ⚡signal feed   ●avatar│
├───────────┬──────────────────────────────────────┬───────────┤
│ Sidebar   │                MAP                   │ Detail    │
│ (300px,   │   violet pins = outgrowers           │ Panel     │
│ white     │   coral pins  = releasers            │ (380px,   │
│ card)     │   size ∝ urgency, pulse on new       │ slides in │
│           │   signal, arcs between matches       │ on pin    │
│ filters   │                                      │ click)    │
├───────────┴──────────────────────────────────────┴───────────┤
│ ▸ Agent console (collapsible drawer, bottom, dark strip)     │
└──────────────────────────────────────────────────────────────┘
```

**TopBar:** wordmark "◆ Outgrow" (violet diamond); segmented control `All / Need space / Releasing space`; search input (filters companies by name, flies map to result); signal-feed bell with unread badge.

**Sidebar (filters):**
- Two selectable stat cards side by side (like the reference's property-type cards): **Need space** (violet icon, live count) and **Releasing** (coral icon, live count).
- **Urgency** slider 0–100 (default 40).
- **Team size** chips: `1–10 · 11–50 · 51–200 · 200+`.
- **Signals** checkboxes with icons: Hiring surge, New exec, Job change, Layoffs, Insolvency, Office listing.
- **Arrondissement** multi-select chips (1–20).
- Bottom row: text button `RESET` + violet pill button `APPLY` (filters actually apply live; APPLY just pulses to honor the reference layout — label it `APPLIED ✓` momentarily).

**Map pins (`CompanyPin`):** circular `divIcon`, fill by type, diameter 12–28 px scaled by urgency, white 2 px ring, number-free. Urgency ≥ 85 → slow CSS pulse. New signal → 3 quick pulses. Hover → floating mini-card (like the reference's listing hover card): name, type badge, one hero stat ("Breach in 2 mo" / "520 m² · 6 wks"), urgency ring.

**Detail panel:** header (name, industry, arrondissement, type badge) + `UrgencyRing` (large, animated sweep on open, color = type). Metric grid 2×2, big tabular numbers: Headcount · Open roles / Was-headcount · Office m² · **Months to breach** (outgrower, red if ≤ 3, "Over capacity" if null) / **Available m² + from** (releaser). Then `SignalTimeline` (icon, title, relative time, source tag `sillage` / `bodacc`). Then `ContactBlock`: decision-maker name + role; if not enriched → violet button **"Find contact"** → 1.5 s shimmer → email + phone fade in with a ✓ ("Found via FullEnrich waterfall"). Then `MatchList`: top matches with score bar + **"Show on map"** (draws the arc, pans to fit both pins). Primary CTA at bottom: **"Draft outreach"** → `OutreachModal` (subject + body, buttons `Regenerate` / `Approve & copy`; on approve, copy to clipboard, toast `Copied — status: contacted`).

**Match arc (`MatchArc` — the signature element):** animated quadratic bézier between the two pins, violet→coral gradient stroke, dash-offset draw-in over ~800 ms, small score chip at the apex ("Match 92"). Simultaneous toast: `🤝 Cartesia Labs ↔ Atelier Numérique — 92`. Optional short "cha-ching" sound — **muted by default**, toggle in TopBar (demo etiquette).

**Agent console:** collapsible bottom drawer, dark (`#17171F`), monospace 13 px, max ~7 visible lines, auto-scroll, icon per event kind (⚡ signal, 🧠 thinking, 🔧 tool_call, ✅ tool_result, 📊 score, 🤝 match, ✉️ draft). Lines fade in. This is how judges *watch the agent think* — keep every line under ~90 chars.

**Copy voice (applies everywhere):** plain verbs, sentence case, specific over clever. Buttons say what they do ("Find contact", "Draft outreach", "Approve & copy"). Empty states direct action ("No matches yet — lower the urgency filter"). Errors say what happened and the fix. No lorem ipsum anywhere.

**Quality floor:** visible keyboard focus states, `prefers-reduced-motion` disables pulses/arc animation, no layout shift when the detail panel opens (map resizes smoothly).

## 13. Demo mode (build this — the pitch depends on it)

- **Hotkey `S`** (and `POST /api/simulate/signal` with no body) fires the scripted hero sequence: a new `hiring_surge` signal lands on Cartesia Labs → console streams ingest → math → score jumps to 94 → pin pulses → FullEnrich tool_call/result → matcher finds Atelier Numérique → **arc draws + toast** → outreach draft event. Total ~12 seconds, fully deterministic, works offline (mock providers).
- **Hotkey `R`** → reset dataset (calls `/api/simulate/reset`, confirm dialog).
- The 2-minute demo story: open on the full map ("every dot is a Paris company our agent is watching") → press `S` → narrate the console as it thinks → click the arc's toast → detail panel with contact + draft → close on the one-liner: *"One hiring spike in, one office matched and two outreach drafts out — before anyone called a broker. Hiring data in, square meters out."*

## 14. Build phases — with gates and cut lines

Work strictly in order. Timings assume ~6 h of build time.

**Phase 0 — Skeleton (≤ 45 min).** Monorepo scaffold, tokens, seed data, `GET /api/companies`, map renders 28 correctly-colored pins with hover mini-cards. Tabs + sidebar are static UI. **GATE: pins on the map, hover works.**

**Phase 1 — Explore (≤ 75 min).** Filters live (client-side), detail panel with metrics + signal timeline + urgency ring, search, design pass to match §12. **GATE: click any pin → complete, polished detail panel.**

**Phase 2 — Agent (≤ 90 min).** `llm.ts` + prompts + pipeline scoring with real Anthropic calls, SSE + AgentConsole, `simulate/signal` + hotkeys, pin pulse on events. **GATE: press `S` → console streams → score/pin update live.**

**Phase 3 — Match & act (≤ 75 min).** Matcher, MatchArc + toast, ContactBlock enrich flow (mock), OutreachModal with Claude-drafted email + phone script, statuses. **GATE: the full 12-second hero sequence runs end-to-end.**

**Phase 4 — Harden & record (≤ 60 min).** Reset flow, error fallbacks (any Claude failure → emit `error` event + canned fallback text, never a blank UI), reduced-motion, README with run steps, **record the 2-min demo video**, rehearse with hotkeys.

**Phase 5 — Only if time remains:** real FullEnrich adapter behind `PROVIDERS=fullenrich` (test on one fictional… no — test on the human's own consented contact only), BODACC live feed toggle, French-language outreach toggle, bottom match-card carousel.

**Cut lines if behind schedule (cut top-first):** bottom carousel → BODACC live → real FullEnrich → phone script channel → search. **Never cut:** hero sequence, console, arc, detail panel, video.

## 15. Setup

```bash
cp .env.example .env       # add ANTHROPIC_API_KEY (hackathon credits)
npm install
npm run dev                # concurrently: server :3001, client :5173 (proxy /api)
```

`.env` is gitignored. App boots and demos fully with only `PROVIDERS=mock` and no keys except Anthropic (needed from Phase 2).

## 16. Non-goals (do not build)

Auth, multi-user, deployment/hosting, mobile layout, real email sending, CRM integration, payments, tests beyond a smoke check of `spacemath.ts` and `matcher.ts`, dark mode.

## 17. Definition of done

A judge can watch: map of Paris → live signal fires → agent visibly reasons in the console → urgency scores update → FullEnrich contact appears → match arc draws between an outgrower and a releaser → grounded outreach draft opens → broker approves. All in under 60 seconds, offline-safe, on synthetic data, with the video already recorded as backup.
