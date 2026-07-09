// BODACC live feed (§9, Phase 5). Real French insolvency open data from the
// public OpenDataSoft API — no key required. Also converts filings into
// releaser companies for the map (distressed firms likely to release office).

import type { Company, Signal } from "../../types";
import { jitter } from "../../paris";

const BASE =
  "https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records";

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

function arrondissementFromCp(cp: string): number | null {
  if (/^75\d{3}$/.test(cp)) {
    const n = parseInt(cp.slice(3), 10);
    return n >= 1 && n <= 20 ? n : null;
  }
  return null;
}

function natureOf(jugementRaw: unknown): string {
  if (typeof jugementRaw !== "string") return "Procédure collective";
  try {
    const j = JSON.parse(jugementRaw);
    return j.nature || j.famille || "Procédure collective";
  } catch {
    return "Procédure collective";
  }
}

/** Fetch recent Paris "procédures collectives" from BODACC. */
export async function fetchBodaccParis(limit = 8): Promise<BodaccRecord[]> {
  const params = new URLSearchParams({
    limit: String(Math.min(20, Math.max(1, limit))),
    refine: 'familleavis_lib:"Procédures collectives"',
    where: 'numerodepartement="75"',
    order_by: "dateparution desc",
  });
  const res = await fetch(`${BASE}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`BODACC ${res.status}`);
  const data = (await res.json()) as { results?: Record<string, unknown>[] };
  return (data.results ?? []).map((r) => {
    const cp = String(r.cp ?? "");
    return {
      id: String(r.id ?? `${r.commercant}-${r.dateparution}`),
      company: String(r.commercant ?? "—"),
      ville: String(r.ville ?? "Paris"),
      cp,
      arrondissement: arrondissementFromCp(cp),
      date: String(r.dateparution ?? ""),
      tribunal: String(r.tribunal ?? ""),
      nature: natureOf(r.jugement),
      url: typeof r.url_complete === "string" ? r.url_complete : undefined,
    };
  });
}

// ── BODACC → map companies ───────────────────────────────────────────────────

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function weeksAheadISO(weeks: number): string {
  return new Date(Date.now() + weeks * 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Turn distressed BODACC filings into releaser companies. Names, arrondissement,
 * filing type and date are REAL (public record); office size and headcount are
 * ESTIMATED (flagged `estimated`) since BODACC doesn't publish them.
 */
export function bodaccToCompanies(records: BodaccRecord[]): Company[] {
  const out: Company[] = [];
  for (const r of records) {
    if (r.arrondissement == null) continue; // need a location to place it
    const seed = hash(r.id + r.company);
    const nature = r.nature.toLowerCase();

    let motivation: Company["motivation"];
    let weeks: number;
    let urgency: number;
    if (nature.includes("liquidation")) {
      motivation = "urgent";
      weeks = 4;
      urgency = 82;
    } else if (nature.includes("redressement")) {
      motivation = "high";
      weeks = 8;
      urgency = 74;
    } else {
      motivation = "moderate";
      weeks = 10;
      urgency = 66;
    }

    const availableSqm = 150 + (seed % 56) * 10; // 150–700 m², deterministic
    const [lat, lng] = jitter(r.arrondissement, seed);

    const signal: Signal = {
      id: `sig-bodacc-${r.id}`,
      companyId: `bodacc-${r.id}`,
      type: "insolvency_filing",
      source: "bodacc",
      title: r.nature,
      detail: `${r.tribunal || "Tribunal de commerce de Paris"} · published ${r.date}`,
      timestamp: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
      weight: 80,
    };

    out.push({
      id: `bodacc-${r.id}`,
      name: r.company,
      type: "releaser",
      industry: "Insolvency (BODACC)",
      arrondissement: r.arrondissement,
      address: `${r.ville} ${r.cp}`,
      lat,
      lng,
      headcount: Math.max(1, Math.round(availableSqm / 20)),
      officeSqm: availableSqm,
      capacityDesks: Math.round(availableSqm / 10),
      wasHeadcount: Math.round(availableSqm / 8),
      releaseReason: "insolvency",
      availableSqm,
      availableFrom: weeksAheadISO(weeks),
      motivation,
      urgencyScore: urgency,
      status: "new",
      signals: [signal],
      matchIds: [],
      origin: "bodacc",
      estimated: true,
    });
  }
  return out;
}
