// EnrichmentProvider adapter (§9). FullEnrich waterfall may be async (job +
// polling) — the interface returns a Promise so the real impl can poll while the
// mock resolves after a fake delay. Real schema is NOT invented here.

import type { Company, Contact } from "../../types";

export interface EnrichmentProvider {
  enrich(company: Company): Promise<Contact>;
}

export { MockEnrichmentProvider } from "./mock";
