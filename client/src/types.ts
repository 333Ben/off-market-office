// Shared data shapes (§7) — mirror of server/src/types.ts.

export type CompanyType = "outgrower" | "releaser";

export type SignalType =
  | "hiring_surge"
  | "exec_hire"
  | "job_change"
  | "champion_departure"
  | "layoffs"
  | "insolvency_filing"
  | "office_listing";

export type SignalSource = "sillage" | "bodacc" | "mock";

export interface Signal {
  id: string;
  companyId: string;
  type: SignalType;
  source: SignalSource;
  title: string;
  detail: string;
  timestamp: string;
  weight: number;
}

export interface Contact {
  fullName: string;
  role: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  enrichmentStatus: "pending" | "found" | "partial";
  source: "fullenrich" | "mock";
}

export type OutreachChannel = "email" | "linkedin" | "multi";

// Result of pushing a contact list to Max (Digital Crew's AI sales agent).
export interface OutreachResult {
  ok: boolean;
  provider: "max";
  real: boolean;
  campaignId: string;
  channel: OutreachChannel;
  queued: number;
  skipped: number;
  companyIds: string[];
  message: string;
}

export type ReleaseReason =
  | "insolvency"
  | "downsizing"
  | "relocation"
  | "remote_shift";

export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  industry: string;
  arrondissement: number;
  address: string;
  lat: number;
  lng: number;
  headcount: number;
  officeSqm: number;
  capacityDesks: number;
  openRoles?: number;
  hiresPerMonth?: number;
  monthsToBreach?: number | null;
  neededSqm?: number;
  releaseReason?: ReleaseReason;
  wasHeadcount?: number;
  availableSqm?: number;
  availableFrom?: string;
  motivation?: "urgent" | "high" | "moderate";
  urgencyScore: number;
  scoreRationale?: string;
  status: "new" | "scored" | "enriched" | "matched" | "contacted";
  signals: Signal[];
  contact?: Contact;
  matchIds: string[];
  origin?: "seed" | "bodacc";
  estimated?: boolean;
}

export interface Match {
  id: string;
  outgrowerId: string;
  releaserId: string;
  score: number;
  sqmFit: number;
  timingFit: number;
  locationFit: number;
  rationale: string;
  status: "suggested" | "approved";
}

export interface OutreachDraft {
  id: string;
  companyId: string;
  matchId?: string;
  channel: "email" | "phone_script";
  subject?: string;
  body: string;
}

export type CadenceChannel = "email" | "linkedin" | "phone";

export interface CadenceStep {
  channel: CadenceChannel;
  day: number;
  subject?: string;
  body: string;
  rationale?: string;
}

export interface Cadence {
  id: string;
  companyId: string;
  matchId?: string;
  lang: "en" | "fr";
  subjectVariants: string[];
  variantPick?: { choice: string; why: string };
  steps: CadenceStep[];
}

export type AgentEventKind =
  | "signal"
  | "thinking"
  | "tool_call"
  | "tool_result"
  | "score"
  | "match"
  | "draft"
  | "error"
  | "info";

export interface AgentEvent {
  id: string;
  timestamp: string;
  kind: AgentEventKind;
  message: string;
  companyId?: string;
}
