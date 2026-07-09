// EnrichmentProvider adapter (§9). FullEnrich waterfall may be async (job +
// polling) — the interface returns a Promise so the real impl can poll while the
// mock resolves after a fake delay. Real schema is NOT invented here.

import type { Company, Contact } from "../../types";

export interface EnrichmentProvider {
  enrich(company: Company): Promise<Contact>;
}

export { MockEnrichmentProvider } from "./mock";

import { MockEnrichmentProvider } from "./mock";
import { FullEnrichProvider } from "./fullenrich";

/** Pick the real FullEnrich adapter only when explicitly enabled + keyed. */
export function getEnrichmentProvider(): {
  provider: EnrichmentProvider;
  real: boolean;
} {
  const providers = (process.env.PROVIDERS || "mock").split(",").map((s) => s.trim());
  const key = process.env.FULLENRICH_API_KEY;
  if (providers.includes("fullenrich") && key) {
    return { provider: new FullEnrichProvider(key), real: true };
  }
  return { provider: new MockEnrichmentProvider(), real: false };
}
