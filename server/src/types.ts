// Shared data shapes (§7). Mirrored in client/src/types.ts — keep in sync.

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
  weight: number; // -100..100 contribution to urgency
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
  real: boolean; // true = real Max MCP call, false = mock
  campaignId: string;
  channel: OutreachChannel;
  queued: number; // contacts actually pushed
  skipped: number; // queued companies with no reachable contact
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
  arrondissement: number; // 1–20
  address: string;
  lat: number;
  lng: number;
  headcount: number;
  officeSqm: number;
  capacityDesks: number; // ≈ officeSqm / 10

  // outgrower only
  openRoles?: number;
  hiresPerMonth?: number;
  monthsToBreach?: number | null; // null = already over capacity
  neededSqm?: number;

  // releaser only
  releaseReason?: ReleaseReason;
  wasHeadcount?: number;
  availableSqm?: number;
  availableFrom?: string; // ISO date
  motivation?: "urgent" | "high" | "moderate";

  // agent state
  urgencyScore: number; // 0–100, Claude-assigned (seeded baseline pre-scoring)
  scoreRationale?: string;
  status: "new" | "scored" | "enriched" | "matched" | "contacted";
  signals: Signal[];
  contact?: Contact;
  matchIds: string[];

  // provenance: undefined/"seed" = synthetic demo, "bodacc" = real public record
  origin?: "seed" | "bodacc";
  estimated?: boolean; // office/space figures are estimated (real companies)
}

export interface Match {
  id: string;
  outgrowerId: string;
  releaserId: string;
  score: number; // 0–100 composite
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

export interface Db {
  companies: Company[];
  matches: Match[];
  drafts: OutreachDraft[];
}
