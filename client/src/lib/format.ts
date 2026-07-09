// Small presentation helpers shared across components.

import type { Company } from "../types";

export const VIOLET = "#6C5CE7";
export const CORAL = "#FF5A5F";

export function typeColor(c: Company): string {
  return c.type === "outgrower" ? VIOLET : CORAL;
}

/** Weeks from now until an ISO date (rounded, floored at 0). */
export function weeksUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.round(ms / (7 * 86_400_000)));
}

/** One hero stat for pins / mini-cards. */
export function heroStat(c: Company): string {
  if (c.type === "outgrower") {
    const m = c.monthsToBreach;
    if (m == null) return "Over capacity";
    if (m < 1) return "Breach imminent";
    return `Breach in ${m % 1 === 0 ? m : m.toFixed(1)} mo`;
  }
  const wks = c.availableFrom ? weeksUntil(c.availableFrom) : null;
  return `${c.availableSqm} m²${wks != null ? ` · ${wks} wks` : ""}`;
}

export function typeLabel(c: Company): string {
  return c.type === "outgrower" ? "Needs space" : "Releasing";
}

/** Pin diameter scales 12–28px with urgency (§12). */
export function pinDiameter(urgency: number): number {
  return Math.round(12 + (Math.max(0, Math.min(100, urgency)) / 100) * 16);
}

/** "20 Aug 2026" — availability dates in the detail panel. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const REASON_LABEL: Record<string, string> = {
  insolvency: "Insolvency",
  downsizing: "Downsizing",
  relocation: "Relocation",
  remote_shift: "Going remote",
};

export function releaseReasonLabel(reason?: string): string {
  return reason ? REASON_LABEL[reason] ?? reason : "";
}
