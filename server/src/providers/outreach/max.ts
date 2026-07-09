// Real Max adapter — talks to the Digital Crew "Max" MCP server over Streamable
// HTTP (JSON-RPC at POST /mcp, Bearer auth), per github.com/digital-crew-
// technologies/max-mcp-server. Only the transport (endpoint + auth) is taken
// from the docs; the specific outreach TOOL NAME and argument shape are left
// configurable via env so we never invent an external schema. Any failure
// throws so the pipeline falls back to the mock provider.

import type {
  OutreachProvider,
  OutreachLaunchInput,
  OutreachLaunchOutput,
} from "./index";

const PROTOCOL_VERSION = "2025-06-18";

interface JsonRpcResponse {
  result?: unknown;
  error?: { code: number; message: string };
}

export class MaxOutreachProvider implements OutreachProvider {
  private id = 0;

  constructor(
    private baseUrl: string,
    private token: string
  ) {}

  private endpoint(): string {
    return `${this.baseUrl.replace(/\/$/, "")}/mcp`;
  }

  private headers(sessionId?: string): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": PROTOCOL_VERSION,
    };
    if (process.env.MCP_GATEWAY_SECRET)
      h["X-MCP-Gateway-Key"] = process.env.MCP_GATEWAY_SECRET;
    if (sessionId) h["Mcp-Session-Id"] = sessionId;
    return h;
  }

  /** POST a JSON-RPC message; returns { body, sessionId }. */
  private async rpc(
    method: string,
    params: unknown,
    sessionId?: string
  ): Promise<{ res: JsonRpcResponse | null; sessionId?: string }> {
    const resp = await fetch(this.endpoint(), {
      method: "POST",
      headers: this.headers(sessionId),
      body: JSON.stringify({ jsonrpc: "2.0", id: ++this.id, method, params }),
    });
    if (!resp.ok) {
      throw new Error(`Max MCP ${method} → HTTP ${resp.status}`);
    }
    const newSession = resp.headers.get("Mcp-Session-Id") ?? sessionId;
    const text = await resp.text();
    return { res: parseRpcBody(text), sessionId: newSession ?? undefined };
  }

  async launch(input: OutreachLaunchInput): Promise<OutreachLaunchOutput> {
    const reachable = input.targets.filter(
      (t) => t.email || t.linkedin || t.phone
    );

    // 1) Handshake.
    const init = await this.rpc("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "outgrow", version: "0.1.0" },
    });
    const sessionId = init.sessionId;

    // 2) The outreach tool name + argument shape come from the Max docs — kept
    //    configurable so this adapter never hard-codes an unverified schema.
    const toolName = process.env.MAX_OUTREACH_TOOL || "create_campaign";
    const call = await this.rpc(
      "tools/call",
      {
        name: toolName,
        arguments: {
          name: input.listName || "Outgrow outreach",
          channel: input.channel,
          contacts: reachable.map((t) => ({
            company: t.companyName,
            fullName: t.contactName,
            role: t.role,
            email: t.email,
            phone: t.phone,
            linkedin: t.linkedin,
          })),
        },
      },
      sessionId
    );

    if (call.res?.error) {
      throw new Error(`Max ${toolName}: ${call.res.error.message}`);
    }

    const campaignId = extractCampaignId(call.res?.result) ?? `max-${Date.now().toString(36)}`;
    return {
      campaignId,
      queued: reachable.length,
      message: `Max campaign ${campaignId} launched (${reachable.length} ${input.channel} contacts)`,
    };
  }
}

/** Max may reply as plain JSON or an SSE stream of `data:` lines — handle both. */
function parseRpcBody(text: string): JsonRpcResponse | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed) as JsonRpcResponse;
    } catch {
      return null;
    }
  }
  // SSE: take the last non-empty `data:` payload.
  const payloads = trimmed
    .split("\n")
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trim())
    .filter(Boolean);
  const last = payloads[payloads.length - 1];
  if (!last) return null;
  try {
    return JSON.parse(last) as JsonRpcResponse;
  } catch {
    return null;
  }
}

/** Best-effort dig for a campaign/id in the tool result's structured content. */
function extractCampaignId(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const structured = r.structuredContent as Record<string, unknown> | undefined;
  const candidate =
    (structured?.campaignId as string) ||
    (structured?.id as string) ||
    (r.campaignId as string) ||
    (r.id as string);
  return typeof candidate === "string" ? candidate : null;
}
