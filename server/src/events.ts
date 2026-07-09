// Agent event bus → SSE hub (§10). emit() fans out to all subscribers
// (the SSE endpoint). Events are ephemeral; the client keeps the last N.

import type { AgentEvent, AgentEventKind } from "./types";

type Listener = (e: AgentEvent) => void;
const listeners = new Set<Listener>();
let seq = 0;

export function emit(
  kind: AgentEventKind,
  message: string,
  companyId?: string
): AgentEvent {
  const e: AgentEvent = {
    id: `evt-${++seq}`,
    timestamp: new Date().toISOString(),
    kind,
    message,
    companyId,
  };
  for (const l of listeners) l(e);
  return e;
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
