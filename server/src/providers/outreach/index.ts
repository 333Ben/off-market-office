// OutreachProvider adapter — pushes an approved contact list to Max, Digital
// Crew's AI sales agent (docs.digitalcrew.tech, max-mcp-server). Mock by default
// so the demo is offline-safe; the real Max MCP client is used only when
// PROVIDERS=max and a token is present. Real tool schemas are NOT invented here.

import type { OutreachChannel } from "../../types";

export interface OutreachTarget {
  companyId: string;
  companyName: string;
  contactName?: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
}

export interface OutreachLaunchInput {
  targets: OutreachTarget[];
  channel: OutreachChannel;
  listName?: string;
}

export interface OutreachLaunchOutput {
  campaignId: string;
  queued: number;
  message: string;
}

export interface OutreachProvider {
  launch(input: OutreachLaunchInput): Promise<OutreachLaunchOutput>;
}

export { MockOutreachProvider } from "./mock";

import { MockOutreachProvider } from "./mock";
import { MaxOutreachProvider } from "./max";

/** Pick the real Max adapter only when explicitly enabled + keyed. */
export function getOutreachProvider(): {
  provider: OutreachProvider;
  real: boolean;
} {
  const providers = (process.env.PROVIDERS || "mock")
    .split(",")
    .map((s) => s.trim());
  const token =
    process.env.DIGITALCREW_API_TOKEN || process.env.DIGITALCREW_BEARER_TOKEN;
  const baseUrl = process.env.DIGITALCREW_API_BASE_URL;
  if (providers.includes("max") && token && baseUrl) {
    return { provider: new MaxOutreachProvider(baseUrl, token), real: true };
  }
  return { provider: new MockOutreachProvider(), real: false };
}
