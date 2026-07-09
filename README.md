# OMO — Off Market Office

**Turns hiring data into square meters.** An AI agent for Paris commercial real-estate brokers that detects companies about to *outgrow* their office (demand) and companies about to *release* office (supply), matches the two live on a map, and drafts the outreach for both sides — before either company has called a broker.

> Built for the Agentic GTM Hackathon (Anthropic × FullEnrich × Sillage), Station F, Paris.
> **All companies, people, and contacts in the demo are synthetic and fictional.**

---

## What it does

Two populations of Paris companies on one map:

| | **Outgrowers** (violet) | **Releasers** (coral) |
|---|---|---|
| Who | Hiring faster than their office can hold | Shrinking, insolvent, relocating, going remote |
| Signals | Hiring surge, new exec hire, job change | Insolvency filing, layoffs, champion exodus, office listing |
| Agent output | Months-to-breach, urgency, decision-maker, outreach email | Available m², availability date, decision-maker, phone script |

The agent scores each company (Claude), enriches the decision-maker (FullEnrich adapter), matches compatible pairs on size/timing/location (deterministic math + Claude rationale), and drafts outreach for both sides. A match renders as an **animated arc between the two pins**.

The human stays in the loop — the agent drafts and recommends; a broker approves. Nothing is sent anywhere.

---

## Setup

```bash
cp .env.example .env      # add ANTHROPIC_API_KEY (see below)
npm install
npm run dev               # server :3001 + client :5173 (Vite proxies /api)
```

Open **http://localhost:5173**.

- **`.env`** holds secrets and is gitignored. Only `ANTHROPIC_API_KEY` is needed; everything else defaults to mock.
- `PROVIDERS=mock` (default) keeps every external call mocked and fully offline-safe. Without an Anthropic key the app still runs — scoring and drafts fall back to deterministic text.
- `npm run seed` regenerates the synthetic dataset (`server/data/db.json`).

---

## Demo hotkeys

| Key | Action |
|-----|--------|
| **S** | Fire the scripted hero sequence (signal → score → enrich → match → drafts) |
| **A** | Run the agent over every unscored company |
| **R** | Reset the dataset to the synthetic seed (with confirm) |

A sound toggle (muted by default) is in the top bar; the match "cha-ching" plays only when enabled.

---

## 2-minute demo script

1. **Open on the full map.** "Every dot is a Paris company our agent is watching — violet needs space, coral is releasing it. Size is urgency."
2. **Press `S`.** Narrate the console as it thinks: a hiring spike lands on **Cartesia Labs**, the math runs, the score jumps to **94**, FullEnrich finds the Head of Workplace, the matcher finds **Atelier Numérique** (**91**).
3. **The arc draws** violet→coral between the 11e and 3e; a toast fires. **Click the toast** → the detail panel opens.
4. Show the contact (found via FullEnrich ✓), the match with its rationale and score bar, then **Draft outreach** → the Claude-written email → **Approve & copy**.
5. Close on the one-liner: *"One hiring spike in, one office matched and two outreach drafts out — before anyone called a broker. Hiring data in, square meters out."*

Everything in the hero sequence is deterministic and works offline on the synthetic dataset.

---

## Live integrations (Phase 5)

- **Sillage live feed** — click the 📡 icon (top bar) to open your team's **real tracked accounts and demand-side signals** via Sillage's documented v2 API (`GET /api/v2/top-account-list/accounts`, `POST /api/v2/contents/query`). Activates automatically when `SILLAGE_API_KEY` is set in `.env`; otherwise the app stays on the synthetic seed. Kept separate from the demo set.
- **BODACC live feed** — click the 🔔 bell (top bar) to open **real** recent Paris insolvency filings (*procédures collectives*) from France's official BODACC open-data API. No key needed. Clearly labeled "LIVE · real data" and kept separate from the synthetic demo set. If offline, it fails gracefully and the demo is unaffected.
- **French outreach** — the outreach modal has an **EN / FR** toggle; switching regenerates the draft in that language (`POST /api/companies/:id/draft {channel, lang}`).
- **Real FullEnrich** (optional, off by default) — a full adapter for the documented FullEnrich v2 waterfall (`POST /contact/enrich/bulk` → poll `GET /contact/enrich/bulk/{id}`). Enable with `PROVIDERS=fullenrich` **and** `FULLENRICH_API_KEY` in `.env`. Because it enriches a *known* person, set a consented contact on the company first (hackathon rule: only enrich contacts you have consent for). Any failure falls back to the mock, so the flow never breaks.
- **Contact via Max** — build a contact list in the table, then hand it to **Max** (Digital Crew's AI sales agent) to run the email/LinkedIn outreach. Mock by default (`POST /api/outreach/launch {companyIds, channel}` returns a campaign id and marks the companies *contacted*). Enable the real [Max MCP server](https://github.com/digital-crew-technologies/max-mcp-server) with `PROVIDERS=max`, `DIGITALCREW_API_TOKEN`, and `DIGITALCREW_API_BASE_URL` in `.env` (optional: `MCP_GATEWAY_SECRET`, and `MAX_OUTREACH_TOOL` to name the campaign tool from the docs). The adapter speaks JSON-RPC over Streamable HTTP at `POST /mcp`; any failure falls back to the mock. Enrichment now also returns **phone and LinkedIn** alongside email.

## Architecture

```
client/   React 18 + Vite + Tailwind + react-leaflet (CARTO Positron) + zustand
server/   Node 20 + Express + TypeScript, in-memory store → server/data/db.json
          SSE stream of agent events · Claude via @anthropic-ai/sdk
          Adapters (interface + mock default):
            SignalProvider · EnrichmentProvider (FullEnrich) · LLM (Anthropic)
```

- **Deterministic math lives in code** (`spacemath.ts`, `matcher.ts`); Claude handles judgment, scoring rationale, and language. Scoring/matching calls return JSON (fences stripped defensively).
- **Every external service sits behind an adapter with a mock implementation as the default.** Real providers are wired only when keys are supplied. Missing keys never crash the app — they log a warning and fall back.
- Any Claude failure emits an `error` line to the console and uses canned fallback text — the UI never blanks.

### Key files

| Path | Role |
|------|------|
| `server/src/pipeline.ts` | ingest → math → score → enrich → match → draft |
| `server/src/matcher.ts` | deterministic sqm / timing / location fit |
| `server/src/spacemath.ts` | capacity math (desks, breach, needed m²) |
| `server/src/prompts.ts` | all Claude prompts |
| `server/src/llm.ts` | Anthropic wrapper + JSON helper |
| `client/src/components/MatchArc.tsx` | the animated match arc |
| `client/src/components/AgentConsole.tsx` | live agent event stream |

---

## API

```
GET  /api/companies?type=&minUrgency=&arrondissements=&signalTypes=
GET  /api/companies/:id
GET  /api/companies/:id/candidates
POST /api/companies/:id/enrich
POST /api/companies/:id/draft   {channel}
GET  /api/matches
POST /api/matches/:id/approve
GET  /api/events                              (SSE)
POST /api/agent/run
POST /api/simulate/signal      {companyId?}   (no body → hero sequence)
POST /api/simulate/reset
```

---

## Accessibility & etiquette

- Visible keyboard-focus states; `prefers-reduced-motion` disables pin pulses, the arc draw-in, the urgency-ring sweep, and map fly animations.
- Match sound is muted by default.
- Footer note on the map: *Demo data is synthetic*.
