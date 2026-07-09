# Sillage integration — how it works

Sillage is Outgrow's real signal source (demand side). It is wired via the MCP
server declared in [`.mcp.json`](../.mcp.json) (`https://api.getsillage.com/api/mcp/v2`).

**The principle: we feed Sillage a tiny input; Sillage does all the discovery.**
We never scrape companies, resolve domains, find people, or invent signals by
hand — that is exactly what Sillage is for.

## Division of labor

| We provide (minimal input) | Sillage does (the work) |
|---|---|
| A **persona** (who to target) | Resolves each domain → the real company |
| A short list of **~5 account domains** | Finds the **decision-makers** at each company |
| A couple of **agents** (signal types) | Detects **real signals** (hiring, job changes) |
| Trigger a run, then **read** results | Tells us who to contact and why |

## Current workspace config (2026-07-09)

- **Persona** — job titles: COO, Head of Workplace, Office Manager, Facilities
  Manager, Head of Operations · seniority c_suite→manager · location **France**
  (⚠️ `"Paris"` alone is rejected by Sillage — the location must resolve to a
  country) · headcount 51–5,000.
- **Accounts (5)** — `mistral.ai`, `qonto.com`, `pennylane.com`, `pigment.com`,
  `payfit.com`. All resolved to the correct real companies by Sillage.
- **Agents**
  - `job_update` — detects job changes / promotions among mapped contacts
    (→ exec hire, job change, champion departure signals).
  - `job_posting_keyword_detection` — watches job postings for
    `Office Manager`, `Head of Workplace`, `Workplace Experience Manager`,
    `Facilities Manager`, `Head of People Operations` (→ **hiring-surge** signal).
  - Note: `keyword_detection` (LinkedIn-post agent) is **not enabled** on this
    workspace — it returns "invalid input".

## Reproduce it

Setup (MCP tools, one-time): `upsert_persona` → `add_top_accounts` (5 domains) →
poll `get_top_account_list_status` until `completed`. Read the decision-makers
with `list_company_mappings` → `get_company_mapping`.

Get signals: `launch_signal_run(agent_id, lookback_days=180)` → poll
`get_signal_run` until `completed` → read with `list_signals`.

## Proof it works (first run)

Sillage found real decision-makers, e.g. **Maria Fernandes — Office Management @
Pigment** (exactly our persona), and detected **5 real hiring signals** from live
LinkedIn job postings:

| Company | Posting detected | Trigger keyword | Date |
|---|---|---|---|
| Qonto | People Operations Manager | Head of People Operations | 2026-07-01 |
| Mistral | Executive Assistant to VP Cloud & VP Product | Office Manager | 2026-06-29 |
| Mistral | Executive Assistant to the CRO | Office Manager | 2026-06-12 |
| Pennylane | People Operations Specialist (×2) | Head of People Operations | 2026-06-23 |

Emails/phones are **not** Sillage's job — those come from the FullEnrich
enrichment provider. The on-stage demo runs on the synthetic dataset (hackathon
rule: no real personal data on stage); this real run only proves the pipeline.
