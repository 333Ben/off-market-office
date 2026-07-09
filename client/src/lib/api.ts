// REST + SSE client (§6).

import type {
  Cadence,
  Company,
  Contact,
  Match,
  OutreachChannel,
  OutreachDraft,
  OutreachResult,
} from "../types";

export interface MatchCandidate {
  companyId: string;
  name: string;
  arrondissement: number;
  score: number;
  sqmFit: number;
  timingFit: number;
  locationFit: number;
}

export async function fetchCompanies(): Promise<Company[]> {
  const res = await fetch("/api/companies");
  if (!res.ok) throw new Error(`GET /api/companies failed: ${res.status}`);
  return res.json();
}

export async function fetchCompany(id: string): Promise<Company> {
  const res = await fetch(`/api/companies/${id}`);
  if (!res.ok) throw new Error(`GET /api/companies/${id} failed: ${res.status}`);
  return res.json();
}

export async function runAgent(): Promise<void> {
  await fetch("/api/agent/run", { method: "POST" });
}

/** No body → fires the scripted hero sequence (§13). */
export async function simulateSignal(companyId?: string): Promise<void> {
  await fetch("/api/simulate/signal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(companyId ? { companyId } : {}),
  });
}

export async function resetDataset(): Promise<void> {
  await fetch("/api/simulate/reset", { method: "POST" });
}

export async function fetchMatches(): Promise<Match[]> {
  const res = await fetch("/api/matches");
  if (!res.ok) throw new Error(`GET /api/matches failed: ${res.status}`);
  return res.json();
}

export async function fetchCandidates(id: string): Promise<MatchCandidate[]> {
  const res = await fetch(`/api/companies/${id}/candidates`);
  if (!res.ok) return [];
  return res.json();
}

export async function enrichCompany(id: string): Promise<Contact> {
  const res = await fetch(`/api/companies/${id}/enrich`, { method: "POST" });
  if (!res.ok) throw new Error(`enrich failed: ${res.status}`);
  return res.json();
}

export async function draftOutreach(
  id: string,
  channel: "email" | "phone_script",
  lang: "en" | "fr" = "en"
): Promise<OutreachDraft> {
  const res = await fetch(`/api/companies/${id}/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel, lang }),
  });
  if (!res.ok) throw new Error(`draft failed: ${res.status}`);
  return res.json();
}

export async function fetchCadence(
  id: string,
  lang: "en" | "fr" = "en",
  matchId?: string
): Promise<Cadence> {
  const res = await fetch(`/api/companies/${id}/cadence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lang, matchId }),
  });
  if (!res.ok) throw new Error(`cadence failed: ${res.status}`);
  return res.json();
}

export interface BodaccRecord {
  id: string;
  company: string;
  ville: string;
  cp: string;
  arrondissement: number | null;
  date: string;
  tribunal: string;
  nature: string;
  url?: string;
}

export async function fetchBodacc(
  limit = 8
): Promise<{ ok: boolean; records: BodaccRecord[]; error?: string }> {
  const res = await fetch(`/api/bodacc?limit=${limit}`);
  if (!res.ok) return { ok: false, records: [], error: `HTTP ${res.status}` };
  return res.json();
}

export async function importBodacc(
  limit = 12
): Promise<{ ok: boolean; added: number; error?: string }> {
  const res = await fetch("/api/bodacc/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limit }),
  });
  if (!res.ok) return { ok: false, added: 0, error: `HTTP ${res.status}` };
  return res.json();
}

export interface SillageAccount {
  id: number;
  name: string;
  domain?: string;
  linkedinUrl?: string;
  logoUrl?: string;
  status?: string;
  importedAt?: string;
}
export interface SillageSignal {
  id: string;
  company: string;
  type: string;
  title: string;
  author?: string;
  headline?: string;
  date?: string;
  url?: string;
}
export async function fetchSillage(): Promise<{
  ok: boolean;
  enabled: boolean;
  accounts: SillageAccount[];
  signals: SillageSignal[];
  total: number;
  error?: string;
}> {
  const res = await fetch("/api/sillage");
  if (!res.ok)
    return { ok: false, enabled: false, accounts: [], signals: [], total: 0 };
  return res.json();
}

export async function launchOutreach(
  companyIds: string[],
  channel: OutreachChannel
): Promise<OutreachResult> {
  const res = await fetch("/api/outreach/launch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyIds, channel }),
  });
  if (!res.ok) throw new Error(`outreach failed: ${res.status}`);
  return res.json();
}

export async function approveMatch(id: string): Promise<Match> {
  const res = await fetch(`/api/matches/${id}/approve`, { method: "POST" });
  if (!res.ok) throw new Error(`approve failed: ${res.status}`);
  return res.json();
}
