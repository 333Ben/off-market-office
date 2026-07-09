// Express app + routes (§11).

import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
// Load the repo-root .env regardless of the workspace cwd.
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), "../../.env") });

import express from "express";
import cors from "cors";
import {
  loadDb,
  getCompanies,
  getCompany,
  resetDb,
  getMatches,
  getMatch,
} from "./store";
import { subscribe, emit } from "./events";
import {
  runAll,
  simulateHero,
  ingestSignal,
  enrichCompany,
  draftCompany,
} from "./pipeline";
import { rankCandidates } from "./matcher";
import type { Signal } from "./types";

const PORT = Number(process.env.PORT) || 3001;
const PROVIDERS = process.env.PROVIDERS || "mock";

loadDb();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, providers: PROVIDERS });
});

// ── Data ────────────────────────────────────────────────────────────────────
app.get("/api/companies", (req, res) => {
  const { type, minUrgency, arrondissements, signalTypes } = req.query;
  const companies = getCompanies({
    type: typeof type === "string" ? type : undefined,
    minUrgency: minUrgency != null ? Number(minUrgency) : undefined,
    arrondissements:
      typeof arrondissements === "string" && arrondissements.length
        ? arrondissements.split(",").map(Number)
        : undefined,
    signalTypes:
      typeof signalTypes === "string" && signalTypes.length
        ? signalTypes.split(",")
        : undefined,
  });
  res.json(companies);
});

app.get("/api/companies/:id", (req, res) => {
  const company = getCompany(req.params.id);
  if (!company) return res.status(404).json({ error: "not found" });
  res.json(company);
});

// Top deterministic match candidates for a company (no LLM) — for the MatchList.
app.get("/api/companies/:id/candidates", (req, res) => {
  const company = getCompany(req.params.id);
  if (!company) return res.status(404).json({ error: "not found" });
  const candidates = rankCandidates(company, getCompanies())
    .slice(0, 3)
    .map((c) => ({
      companyId: c.company.id,
      name: c.company.name,
      arrondissement: c.company.arrondissement,
      score: c.score,
      sqmFit: c.sqmFit,
      timingFit: c.timingFit,
      locationFit: c.locationFit,
    }));
  res.json(candidates);
});

app.post("/api/companies/:id/enrich", async (req, res) => {
  const company = getCompany(req.params.id);
  if (!company) return res.status(404).json({ error: "not found" });
  try {
    const contact = await enrichCompany(company);
    res.json(contact);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post("/api/companies/:id/draft", async (req, res) => {
  const company = getCompany(req.params.id);
  if (!company) return res.status(404).json({ error: "not found" });
  const channel =
    req.body?.channel === "phone_script" ? "phone_script" : "email";
  try {
    const draft = await draftCompany(company, channel);
    res.json(draft);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get("/api/matches", (_req, res) => {
  res.json(getMatches());
});

app.post("/api/matches/:id/approve", (req, res) => {
  const match = getMatch(req.params.id);
  if (!match) return res.status(404).json({ error: "not found" });
  match.status = "approved";
  emit("info", `Match ${match.id} approved.`);
  res.json(match);
});

// ── SSE event stream (§11) ────────────────────────────────────────────────────
app.get("/api/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write(`: connected\n\n`);

  const unsubscribe = subscribe((e) => {
    res.write(`data: ${JSON.stringify(e)}\n\n`);
  });
  const heartbeat = setInterval(() => res.write(`: ping\n\n`), 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

// ── Agent + simulation ────────────────────────────────────────────────────────
app.post("/api/agent/run", async (_req, res) => {
  res.json({ ok: true });
  runAll().catch((e) => emit("error", `Agent run failed: ${e.message}`));
});

app.post("/api/simulate/signal", async (req, res) => {
  const { companyId } = req.body ?? {};
  if (!companyId) {
    res.json({ ok: true, hero: true });
    simulateHero().catch((e) => emit("error", `Simulate failed: ${e.message}`));
    return;
  }
  const company = getCompany(companyId);
  if (!company) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
  const signal: Signal = {
    id: `sig-live-${Date.now()}`,
    companyId,
    type: "hiring_surge",
    source: "sillage",
    title: "New signal detected",
    detail: "Live signal ingested from the feed.",
    timestamp: new Date().toISOString(),
    weight: 50,
  };
  ingestSignal(company, signal).catch((e) =>
    emit("error", `Ingest failed: ${e.message}`)
  );
});

app.post("/api/simulate/reset", (_req, res) => {
  resetDb();
  emit("info", "Dataset reset to synthetic seed.");
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Outgrow server on http://localhost:${PORT}  (providers: ${PROVIDERS})`);
});
