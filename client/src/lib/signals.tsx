// Signal presentation: icon + human label + source tag styling.

import {
  Flame,
  UserPlus,
  ArrowLeftRight,
  UserMinus,
  Users,
  FileWarning,
  Building2,
  type LucideIcon,
} from "lucide-react";
import type { SignalType, SignalSource } from "../types";

export const SIGNAL_META: Record<SignalType, { icon: LucideIcon; label: string }> = {
  hiring_surge: { icon: Flame, label: "Hiring surge" },
  exec_hire: { icon: UserPlus, label: "New exec hire" },
  job_change: { icon: ArrowLeftRight, label: "Job change" },
  champion_departure: { icon: UserMinus, label: "Champion departure" },
  layoffs: { icon: Users, label: "Layoffs" },
  insolvency_filing: { icon: FileWarning, label: "Insolvency filing" },
  office_listing: { icon: Building2, label: "Office listing" },
};

export const SOURCE_STYLE: Record<SignalSource, { label: string; bg: string; fg: string }> = {
  sillage: { label: "sillage", bg: "var(--violet-tint)", fg: "var(--violet)" },
  bodacc: { label: "bodacc", bg: "#FEF3C7", fg: "#B45309" },
  mock: { label: "signal", bg: "#F3F4F6", fg: "#6B7280" },
};

/** Compact relative time, e.g. "3d ago", "just now". */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86_400_000;
  const days = Math.floor(diff / day);
  if (days <= 0) {
    const hrs = Math.floor(diff / 3_600_000);
    return hrs <= 0 ? "just now" : `${hrs}h ago`;
  }
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
