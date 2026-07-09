// Real Max adapter — Digital Crew "Max" AI sales agent, REST API v1
// (https://max.digitalcrew.tech, docs.digitalcrew.tech). Bearer max_live_ auth.
//
// "Contact via Max" hands the approved contact list to Max:
//   1. create a prospect list        POST /api/v1/prospect-lists/import-csv
//   2. if a sending account is connected in the SAME workspace as the key:
//        a. AI-generate a workflow    POST /api/v1/ai-agent/generate-workflow
//        b. create the campaign       POST /api/v1/campaigns
//        c. launch it (unless MAX_DRAFT_ONLY)  POST /api/v1/campaigns/{id}/launch
// If no account is connected (or any step fails) it gracefully stops at the
// list and reports why. Any hard failure throws so the pipeline falls back to
// the mock provider. Schemas come from the docs — nothing is invented.

import type {
  OutreachProvider,
  OutreachLaunchInput,
  OutreachLaunchOutput,
} from "./index";

interface MaxAccount {
  id: string;
  channel?: string;
  status?: string;
  email?: string;
}

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
  private async req(path: string, init?: RequestInit): Promise<Response> {
    return fetch(this.url(path), {
      ...init,
      headers: { ...this.headers(), ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(45000),
    });
  }

  async launch(input: OutreachLaunchInput): Promise<OutreachLaunchOutput> {
    const reachable = input.targets.filter((t) => t.email);
    if (reachable.length === 0) {
      throw new Error("Max: no contacts with an email to import");
    }

    // 1) Create the prospect list (list + prospects in one call).
    const listName =
      input.listName || `OMO outreach — ${new Date().toISOString().slice(0, 10)}`;
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
    const listRes = await this.req("/api/v1/prospect-lists/import-csv", {
      method: "POST",
      body: JSON.stringify({ list_name: listName, prospects }),
    });
    if (!listRes.ok) {
      const body = await listRes.text().catch(() => "");
      throw new Error(`Max import-csv ${listRes.status}${body ? `: ${body.slice(0, 160)}` : ""}`);
    }
    const listJson = (await listRes.json()) as {
      data?: { id?: string };
      imported?: number;
      existing?: number;
    };
    const listId = listJson.data?.id ?? "unknown";
    const queued = (listJson.imported ?? 0) + (listJson.existing ?? 0);

    // 2) Try to launch a real campaign (needs a connected sending account).
    try {
      const account = await this.pickAccount(input.channel);
      if (!account) {
        return {
          campaignId: listId,
          queued,
          message: `Max: created list "${listName}" (${queued} contacts). No sending account connected in this workspace — connect one in Max to launch a campaign.`,
        };
      }

      const workflow = await this.generateWorkflow(input.channel);
      const campaign = await this.createCampaign(
        workflow.name || listName,
        listId,
        account.id,
        workflow.workflow_config
      );

      if (process.env.MAX_DRAFT_ONLY === "1") {
        return {
          campaignId: campaign.id,
          queued,
          message: `Max: campaign "${workflow.name || listName}" created as draft (${queued} contacts) — review & launch in Max.`,
        };
      }

      await this.launchCampaign(campaign.id);
      return {
        campaignId: campaign.id,
        queued,
        message: `Max: launched campaign "${workflow.name || listName}" — ${queued} contact(s) via ${input.channel}.`,
      };
    } catch (e) {
      // The list is real regardless; report why the campaign didn't launch.
      return {
        campaignId: listId,
        queued,
        message: `Max: list "${listName}" created (${queued} contacts). Campaign not launched: ${(e as Error).message}`,
      };
    }
  }

  private async pickAccount(channel: string): Promise<MaxAccount | null> {
    const res = await this.req("/api/v1/accounts");
    if (!res.ok) return null;
    const { data } = (await res.json()) as { data?: MaxAccount[] };
    const connected = (data ?? []).filter((a) => a.status === "connected");
    if (connected.length === 0) return null;
    const want = channel === "linkedin" ? "linkedin" : "email";
    return (
      connected.find((a) => a.channel === want) ?? connected[0] ?? null
    );
  }

  private async generateWorkflow(
    channel: string
  ): Promise<{ workflow_config: unknown; name?: string }> {
    const steps =
      channel === "linkedin"
        ? "a LinkedIn connection request followed by a short LinkedIn message"
        : channel === "multi"
          ? "a cold email, then a LinkedIn message two days later"
          : "a two-step cold email sequence";
    const prompt = `${steps} from a Paris commercial real-estate broker reaching a company that is either outgrowing its office or releasing space. Congratulate-then-help tone, one clear call to action per step.`;
    const res = await this.req("/api/v1/ai-agent/generate-workflow", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error(`generate-workflow ${res.status}`);
    const { data } = (await res.json()) as {
      data?: { workflow_config?: unknown; campaign_name?: string };
    };
    if (!data?.workflow_config) throw new Error("no workflow generated");
    return { workflow_config: data.workflow_config, name: data.campaign_name };
  }

  private async createCampaign(
    name: string,
    listId: string,
    accountId: string,
    workflow_config: unknown
  ): Promise<{ id: string }> {
    const res = await this.req("/api/v1/campaigns", {
      method: "POST",
      body: JSON.stringify({
        name,
        included_lists: [listId],
        accounts: [{ account_id: accountId }],
        workflow_config,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`create-campaign ${res.status}${body ? `: ${body.slice(0, 120)}` : ""}`);
    }
    const { data } = (await res.json()) as { data?: { id?: string } };
    if (!data?.id) throw new Error("campaign created but no id");
    return { id: data.id };
  }

  private async launchCampaign(id: string): Promise<void> {
    const res = await this.req(`/api/v1/campaigns/${id}/launch`, {
      method: "POST",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`launch ${res.status}${body ? `: ${body.slice(0, 120)}` : ""}`);
    }
  }
}
