// Real FullEnrich adapter (§9, Phase 5). Uses the DOCUMENTED v2 API
// (https://docs.fullenrich.com) — no invented schemas. Enabled only when
// PROVIDERS includes "fullenrich" AND FULLENRICH_API_KEY is set. FullEnrich
// enriches a KNOWN person (waterfall for their work email/phone), so per the
// hackathon rules this must be tested only on a contact you have consent for —
// set that person as the company's contact before enabling. On any failure the
// caller falls back to the mock provider, so the demo never breaks.

import type { Company, Contact } from "../../types";
import type { EnrichmentProvider } from "./index";

const BASE = "https://app.fullenrich.com/api/v2";

interface BulkResult {
  status: string;
  data?: Array<{
    contact_info?: {
      most_probable_work_email?: { email?: string };
      most_probable_personal_email?: { email?: string };
      most_probable_phone?: { number?: string };
    };
  }>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class FullEnrichProvider implements EnrichmentProvider {
  constructor(private apiKey: string) {}

  async enrich(company: Company): Promise<Contact> {
    // A known, consented contact is required to enrich.
    const [firstName, ...rest] = (company.contact?.fullName ?? "").split(" ");
    const lastName = rest.join(" ");
    if (!firstName || !lastName) {
      throw new Error("FullEnrich needs a known contact name (consent required)");
    }
    const domain = company.contact?.email?.split("@")[1];

    // 1) Start the bulk enrichment job (POST /contact/enrich/bulk).
    const startRes = await fetch(`${BASE}/contact/enrich/bulk`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `outgrow-${company.id}`,
        data: [
          {
            first_name: firstName,
            last_name: lastName,
            company_name: company.name,
            domain,
            enrich_fields: [
              "contact.work_emails",
              "contact.personal_emails",
              "contact.phones",
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!startRes.ok) throw new Error(`FullEnrich start ${startRes.status}`);
    const { enrichment_id } = (await startRes.json()) as {
      enrichment_id: string;
    };

    // 2) Poll for results (GET /contact/enrich/bulk/{enrichment_id}).
    for (let i = 0; i < 20; i++) {
      await sleep(1500);
      const res = await fetch(`${BASE}/contact/enrich/bulk/${enrichment_id}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const result = (await res.json()) as BulkResult;
      if (result.status === "FINISHED") {
        const info = result.data?.[0]?.contact_info;
        const email =
          info?.most_probable_work_email?.email ??
          info?.most_probable_personal_email?.email;
        const phone = info?.most_probable_phone?.number;
        return {
          fullName: company.contact!.fullName,
          role: company.contact?.role ?? "Decision maker",
          email,
          phone,
          enrichmentStatus: email || phone ? "found" : "partial",
          source: "fullenrich",
        };
      }
      if (["CANCELED", "CREDITS_INSUFFICIENT", "UNKNOWN"].includes(result.status)) {
        throw new Error(`FullEnrich status ${result.status}`);
      }
    }
    throw new Error("FullEnrich timed out");
  }
}
