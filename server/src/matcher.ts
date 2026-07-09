// Deterministic match math (§10). The LLM never computes these numbers — it
// only writes the rationale for the top candidate.

import type { Company } from "./types";

const WEEK_MS = 7 * 86_400_000;
const WEEKS_PER_MONTH = 4.345;

function haversineKm(a: Company, b: Company): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function weeksUntil(iso: string): number {
  return Math.max(0, (new Date(iso).getTime() - Date.now()) / WEEK_MS);
}

export interface Fit {
  score: number;
  sqmFit: number;
  timingFit: number;
  locationFit: number;
}

/** Fit between an outgrower (demand) and a releaser (supply). */
export function computeFit(out: Company, rel: Company): Fit {
  const needed = out.neededSqm || out.headcount * 10;
  const avail = rel.availableSqm ?? 0;

  const sqmFit =
    100 - Math.min(100, (Math.abs(avail - needed) / needed) * 100);

  // Timing: 100 if space frees up before the breach window (+2wk grace), decays after.
  const breachWeeks =
    out.monthsToBreach == null ? 0 : out.monthsToBreach * WEEKS_PER_MONTH;
  const availWeeks = rel.availableFrom ? weeksUntil(rel.availableFrom) : 0;
  const late = availWeeks - breachWeeks - 2;
  const timingFit = late <= 0 ? 100 : Math.max(0, 100 - late * 8);

  // Location: −12 per arrondissement-distance step (haversine-derived), floor 20.
  const step = Math.round(haversineKm(out, rel));
  const locationFit = Math.max(20, 100 - 12 * step);

  const score = Math.round(
    0.45 * sqmFit + 0.35 * timingFit + 0.2 * locationFit
  );
  return {
    score,
    sqmFit: Math.round(sqmFit),
    timingFit: Math.round(timingFit),
    locationFit: Math.round(locationFit),
  };
}

export interface Candidate extends Fit {
  company: Company;
}

/** Ranked counterparts for a company (releasers for an outgrower, and vice versa). */
export function rankCandidates(company: Company, all: Company[]): Candidate[] {
  const counterparts = all.filter(
    (c) => c.type !== company.type && c.id !== company.id
  );
  return counterparts
    .map((c) => {
      const [o, r] = company.type === "outgrower" ? [company, c] : [c, company];
      return { company: c, ...computeFit(o, r) };
    })
    .sort((a, b) => b.score - a.score);
}
