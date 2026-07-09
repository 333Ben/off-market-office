// In-memory store persisted to server/data/db.json (§4). No database.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Company, Db, Match, OutreachDraft } from "./types";
import { buildSeed } from "./seed";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const DB_PATH = join(DATA_DIR, "db.json");

let db: Db = { companies: [], matches: [], drafts: [] };

function persist() {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

/** Load db.json, seeding it on first boot if missing (§8). */
export function loadDb(): void {
  if (existsSync(DB_PATH)) {
    db = JSON.parse(readFileSync(DB_PATH, "utf-8")) as Db;
    console.log(`Loaded ${db.companies.length} companies from db.json`);
  } else {
    db = { companies: buildSeed(), matches: [], drafts: [] };
    persist();
    console.log(`Seeded ${db.companies.length} companies → db.json`);
  }
}

/** Re-seed from scratch (demo safety — POST /api/simulate/reset). */
export function resetDb(): void {
  db = { companies: buildSeed(), matches: [], drafts: [] };
  persist();
}

export interface CompanyFilter {
  type?: string;
  minUrgency?: number;
  arrondissements?: number[];
  signalTypes?: string[];
}

export function getCompanies(filter: CompanyFilter = {}): Company[] {
  return db.companies.filter((c) => {
    if (filter.type && c.type !== filter.type) return false;
    if (filter.minUrgency != null && c.urgencyScore < filter.minUrgency)
      return false;
    if (
      filter.arrondissements &&
      filter.arrondissements.length > 0 &&
      !filter.arrondissements.includes(c.arrondissement)
    )
      return false;
    if (filter.signalTypes && filter.signalTypes.length > 0) {
      const has = c.signals.some((s) => filter.signalTypes!.includes(s.type));
      if (!has) return false;
    }
    return true;
  });
}

export function getCompany(id: string): Company | undefined {
  return db.companies.find((c) => c.id === id);
}

/** Append companies that aren't already present (by id). Returns the ones added. */
export function addCompanies(companies: Company[]): Company[] {
  const existing = new Set(db.companies.map((c) => c.id));
  const fresh = companies.filter((c) => !existing.has(c.id));
  db.companies.push(...fresh);
  if (fresh.length) persist();
  return fresh;
}

export function getDb(): Db {
  return db;
}

export function saveDb(): void {
  persist();
}

export function getMatches(): Match[] {
  return db.matches;
}

export function getMatch(id: string): Match | undefined {
  return db.matches.find((m) => m.id === id);
}

/** Upsert a match by (outgrower, releaser) pair. */
export function upsertMatch(match: Match): Match {
  const existing = db.matches.find(
    (m) =>
      m.outgrowerId === match.outgrowerId && m.releaserId === match.releaserId
  );
  if (existing) {
    Object.assign(existing, match, { id: existing.id });
    return existing;
  }
  db.matches.push(match);
  return match;
}

export function addDraft(draft: OutreachDraft): void {
  db.drafts = db.drafts.filter(
    (d) => !(d.companyId === draft.companyId && d.channel === draft.channel)
  );
  db.drafts.push(draft);
}

export function getDraftsFor(companyId: string): OutreachDraft[] {
  return db.drafts.filter((d) => d.companyId === companyId);
}
