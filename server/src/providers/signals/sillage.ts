// Real Sillage adapter (§9, Phase 5) — uses the DOCUMENTED v2 API
// (https://www.getsillage.com/docs/api). No invented schemas: base URL, auth,
// and endpoints are verified from the docs + a live probe of the workspace.
// Enabled whenever SILLAGE_API_KEY is present; otherwise the app stays on the
// synthetic seed. Real demand-side signals (hiring, job changes, exec moves)
// for the team's tracked accounts.

const BASE = "https://api.getsillage.com";

function key(): string | undefined {
  return process.env.SILLAGE_API_KEY;
}

export function sillageEnabled(): boolean {
  return !!key();
}

async function sillageFetch(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Sillage ${res.status}`);
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

/** GET /api/v2/top-account-list/accounts — the team's tracked companies. */
export async function fetchSillageAccounts(): Promise<SillageAccount[]> {
  const json = (await sillageFetch("/api/v2/top-account-list/accounts")) as {
    data?: Array<{
      id: number;
      company?: {
        name?: string;
        domain?: string;
        linkedin_url?: string;
        logo_url?: string;
        status?: string;
      };
      imported_at?: string;
    }>;
  };
  return (json.data ?? []).map((a) => ({
    id: a.id,
    name: a.company?.name ?? `Account ${a.id}`,
    domain: a.company?.domain,
    linkedinUrl: a.company?.linkedin_url,
    logoUrl: a.company?.logo_url,
    status: a.company?.status,
    importedAt: a.imported_at,
  }));
}

// Maps a Sillage content item (verified shape: content_type, created_at,
// data.{text,author,posted_at,linkedin_url}, company_id) to a display signal.
function mapSignal(
  item: Record<string, unknown>,
  resolved: Map<number, string>
): SillageSignal {
  const s = item as Record<string, any>;
  const data = s.data ?? {};
  const author = data.author ?? {};
  const headline: string = author.headline ?? "";
  // company_id is often null on comments; fall back to the company named in the
  // author's LinkedIn headline (e.g. "Head of HR Operations, Pennylane").
  const fromHeadline = headline.includes(",")
    ? headline.split(",").pop()!.trim()
    : "";
  const company =
    (typeof s.company_id === "number" ? resolved.get(s.company_id) : undefined) ||
    fromHeadline ||
    author.full_name ||
    "Tracked account";
  return {
    id: String(s.id),
    company,
    type: String(s.content_type ?? "signal"),
    title: String(data.text ?? headline ?? "Signal").slice(0, 240),
    author: author.full_name,
    headline: author.headline,
    date: data.posted_at ?? s.created_at,
    url: data.linkedin_url,
  };
}

/** POST /api/v2/contents/query — recent signals/content for tracked accounts. */
export async function fetchSillageSignals(
  limit = 10
): Promise<{ total: number; signals: SillageSignal[] }> {
  const json = (await sillageFetch("/api/v2/contents/query", {
    method: "POST",
    body: JSON.stringify({ page_size: Math.min(50, Math.max(1, limit)) }),
  })) as {
    data?: Record<string, unknown>[];
    meta?: {
      pagination?: { total?: number };
      resolved_companies?: Array<{ id?: number; name?: string }>;
    };
  };
  const resolved = new Map<number, string>();
  for (const c of json.meta?.resolved_companies ?? []) {
    if (typeof c.id === "number" && c.name) resolved.set(c.id, c.name);
  }
  return {
    total: json.meta?.pagination?.total ?? (json.data?.length ?? 0),
    signals: (json.data ?? []).map((i) => mapSignal(i, resolved)),
  };
}
