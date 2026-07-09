// Real Max adapter — Digital Crew "Max" AI sales agent, REST API v1
// (https://max.digitalcrew.tech, docs.digitalcrew.tech). Bearer max_live_ auth.
// "Contact via Max" hands the approved contact list to Max as a prospect list
// (POST /api/v1/prospect-lists/import-csv) — a real, visible list in the Max
// workspace, ready for Max to run a campaign. Launching an actual campaign
// additionally requires a connected sending account (Unipile), which the broker
// connects in the Max app; when none is connected we stop at the list and say so.
// Any failure throws so the pipeline falls back to the mock provider.

import type {
  OutreachProvider,
  OutreachLaunchInput,
  OutreachLaunchOutput,
} from "./index";

export class MaxOutreachProvider implements OutreachProvider {
  constructor(
    private baseUrl: string,
    private token: string
  ) {}

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/$/, "")}${path}`;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  async launch(input: OutreachLaunchInput): Promise<OutreachLaunchOutput> {
    const reachable = input.targets.filter((t) => t.email);
    if (reachable.length === 0) {
      throw new Error("Max: no contacts with an email to import");
    }

    const prospects = reachable.map((t) => {
      const [first, ...rest] = (t.contactName ?? "").split(" ");
      return {
        email: t.email!,
        first_name: first || undefined,
        last_name: rest.join(" ") || undefined,
        title: t.role || undefined,
        linkedin_url: t.linkedin || undefined,
        organization_domain: t.email!.split("@")[1],
      };
    });

    const listName =
      input.listName || `OMO outreach — ${new Date().toISOString().slice(0, 10)}`;

    // Create the prospect list in Max (one call: list + prospects).
    const res = await fetch(this.url("/api/v1/prospect-lists/import-csv"), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ list_name: listName, prospects }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Max import-csv ${res.status}${body ? `: ${body.slice(0, 160)}` : ""}`);
    }
    const json = (await res.json()) as {
      data?: { id?: string; list_name?: string };
      imported?: number;
      existing?: number;
    };
    const listId = json.data?.id ?? "unknown";
    const queued = (json.imported ?? 0) + (json.existing ?? 0);

    // A campaign can only actually send if a sending account is connected.
    let accounts = 0;
    try {
      const a = await fetch(this.url("/api/v1/accounts"), {
        headers: this.headers(),
        signal: AbortSignal.timeout(10000),
      });
      if (a.ok) {
        const aj = (await a.json()) as { data?: unknown[] };
        accounts = aj.data?.length ?? 0;
      }
    } catch {
      /* non-fatal */
    }

    const message =
      accounts > 0
        ? `Max: list "${listName}" ready (${queued} contacts) — launch a ${input.channel} campaign in Max`
        : `Max: created list "${listName}" with ${queued} contacts. Connect a sending account in Max to launch.`;

    return { campaignId: listId, queued, message };
  }
}
