import { useEffect, useRef } from "react";
import {
  ChevronDown,
  ChevronUp,
  Zap,
  Brain,
  Wrench,
  CheckCircle2,
  BarChart3,
  Sparkles,
  Mail,
  AlertTriangle,
  Info,
  type LucideIcon,
} from "lucide-react";
import { useStore } from "../store";
import type { AgentEventKind } from "../types";

const META: Record<AgentEventKind, { icon: LucideIcon; bg: string; fg: string }> = {
  signal: { icon: Zap, bg: "var(--violet-tint)", fg: "var(--violet)" },
  thinking: { icon: Brain, bg: "#EEF0F7", fg: "#565D78" },
  tool_call: { icon: Wrench, bg: "#FEF3C7", fg: "#B45309" },
  tool_result: { icon: CheckCircle2, bg: "#DCFCE7", fg: "#16A34A" },
  score: { icon: BarChart3, bg: "var(--violet-tint)", fg: "var(--violet)" },
  match: { icon: Sparkles, bg: "var(--coral-tint)", fg: "var(--coral)" },
  draft: { icon: Mail, bg: "var(--violet-tint)", fg: "var(--violet)" },
  error: { icon: AlertTriangle, bg: "#FEE2E2", fg: "#DC2626" },
  info: { icon: Info, bg: "#EEF0F7", fg: "#949BB4" },
};

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AgentConsole() {
  const events = useStore((s) => s.events);
  const open = useStore((s) => s.consoleOpen);
  const toggle = useStore((s) => s.toggleConsole);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [events, open]);

  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-[1100] w-[340px] overflow-hidden rounded-panel border border-border bg-card shadow-pop">
      {/* Header */}
      <button
        onClick={toggle}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-violet" />
        </span>
        <span className="text-sm font-700 text-ink">Agent activity</span>
        <span className="rounded-full bg-page px-2 py-0.5 text-[11px] font-600 tabular-nums text-secondary">
          {events.length}
        </span>
        <span className="ml-auto text-muted">
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </span>
      </button>

      {open && (
        <div
          ref={scroller}
          className="max-h-[240px] min-h-[120px] overflow-y-auto border-t border-border px-3 py-2.5"
        >
          {events.length === 0 ? (
            <p className="px-1 py-3 text-sm text-muted">
              Waiting for signals — press{" "}
              <kbd className="rounded border border-border bg-page px-1.5 py-0.5 font-mono text-[11px] font-600">
                S
              </kbd>{" "}
              to run the demo.
            </p>
          ) : (
            events.map((e) => {
              const m = META[e.kind];
              const Icon = m.icon;
              return (
                <div
                  key={e.id}
                  className="console-line flex items-start gap-2.5 rounded-chip px-1 py-1.5"
                >
                  <span
                    className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full"
                    style={{ background: m.bg, color: m.fg }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] leading-snug text-ink">
                    {e.message}
                  </span>
                  <span className="mt-0.5 shrink-0 text-[10px] tabular-nums text-muted">
                    {hhmm(e.timestamp)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
