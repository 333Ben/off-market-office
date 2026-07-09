// Anthropic wrapper (§5, §10). JSON-mode helper strips fences defensively.
// Model claude-sonnet-4-6 (overridable via ANTHROPIC_MODEL). Missing key never
// crashes — callers catch and fall back.

import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

let client: Anthropic | null = null;
let warned = false;

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    if (!warned) {
      console.warn("[llm] ANTHROPIC_API_KEY not set — using deterministic fallbacks");
      warned = true;
    }
    return null;
  }
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

export function hasLLM(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/** Extract the first balanced JSON object, tolerating ``` fences and prose. */
function extractJson(text: string): string {
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return t.slice(start, end + 1);
  return t;
}

function textOf(resp: Anthropic.Message): string {
  return resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export async function jsonCall<T>(
  system: string,
  user: string,
  temperature = 0.2,
  maxTokens = 1024
): Promise<T> {
  const c = getClient();
  if (!c) throw new Error("no-llm");
  const resp = await c.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: [{ role: "user", content: user }],
  });
  return JSON.parse(extractJson(textOf(resp))) as T;
}

export async function textCall(
  system: string,
  user: string,
  temperature = 0.7,
  maxTokens = 700
): Promise<string> {
  const c = getClient();
  if (!c) throw new Error("no-llm");
  const resp = await c.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: [{ role: "user", content: user }],
  });
  return textOf(resp);
}
