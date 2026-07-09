// BODACC live feed (§9, Phase 5). Real French insolvency open data from the
// public OpenDataSoft API — no key required. Clearly separated from the
// synthetic demo set in the UI. This is genuine external data, not invented.

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
