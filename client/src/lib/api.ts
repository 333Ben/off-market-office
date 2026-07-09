// REST + SSE client (§6).

import type { Company, Contact, Match, OutreachDraft } from "../types";

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

export async function approveMatch(id: string): Promise<Match> {
  const res = await fetch(`/api/matches/${id}/approve`, { method: "POST" });
  if (!res.ok) throw new Error(`approve failed: ${res.status}`);
  return res.json();
}
