// Default EnrichmentProvider. Returns a fictional decision-maker after a ~1.5s
// delay so the demo enrich flow feels like a real waterfall lookup.

import type { Company, Contact } from "../../types";
import type { EnrichmentProvider } from "./index";

const ROLE_BY_TYPE: Record<string, string[]> = {
  outgrower: ["Head of Workplace", "COO", "Head of People"],
  releaser: ["CFO", "Office Manager", "Head of Operations"],
};

const FIRST = ["Camille", "Julien", "Léa", "Antoine", "Sofia", "Marc", "Inès", "Hugo"];
const LAST = ["Moreau", "Girard", "Lefevre", "Bonnet", "Rousseau", "Dupont", "Marchand", "Perrin"];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

export class MockEnrichmentProvider implements EnrichmentProvider {
  enrich(company: Company): Promise<Contact> {
    const seed = company.id.length + company.name.length;
    const first = pick(FIRST, seed);
    const last = pick(LAST, seed * 3 + 1);
    const role = pick(ROLE_BY_TYPE[company.type] ?? ROLE_BY_TYPE.outgrower, seed);
    const handle = `${first}.${last}`.toLowerCase();
    const slug = company.name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 10);
    const contact: Contact = {
      fullName: `${first} ${last}`,
      role,
      email: `${handle}@${slug}.example.fr`,
      phone: `+33 1 00 ${String(10 + (seed % 89)).padStart(2, "0")} ${String(10 + (seed * 2) % 89).padStart(2, "0")} ${String(10 + (seed * 3) % 89).padStart(2, "0")}`,
      linkedin: `https://www.linkedin.com/in/${handle.replace(".", "-")}-${slug}`,
      enrichmentStatus: "found",
      source: "mock",
    };
    return new Promise((resolve) => setTimeout(() => resolve(contact), 1500));
  }
}
