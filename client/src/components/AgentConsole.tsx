import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Terminal } from "lucide-react";
import { useStore } from "../store";
import type { AgentEventKind } from "../types";

const ICON: Record<AgentEventKind, string> = {
  signal: "⚡",
  thinking: "🧠",
  tool_call: "🔧",
  tool_result: "✅",
  score: "📊",
  match: "🤝",
  draft: "✉️",
  error: "⛔",
  info: "•",
};

function hhmmss(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour12: false });
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
    <div className="shrink-0 border-t border-black/40 bg-[#17171F] text-white">
      <button
        onClick={toggle}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-600 uppercase tracking-wide text-white/70 hover:text-white"
      >
        <Terminal className="h-3.5 w-3.5" />
        Agent console
        <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] tabular-nums text-white/60">
          {events.length}
        </span>
        <span className="ml-auto">
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
          className="max-h-[168px] min-h-[168px] overflow-y-auto px-4 pb-3 font-mono text-[13px] leading-relaxed"
        >
          {events.length === 0 ? (
            <p className="text-white/40">
              Waiting for signals — press{" "}
              <kbd className="rounded bg-white/10 px-1">S</kbd> to fire the demo
              sequence.
            </p>
          ) : (
            events.map((e) => (
              <div key={e.id} className="console-line flex gap-2 py-0.5">
                <span className="shrink-0 text-white/30 tabular-nums">
                  {hhmmss(e.timestamp)}
                </span>
                <span className="shrink-0">{ICON[e.kind]}</span>
                <span
                  className={
                    e.kind === "error"
                      ? "text-[#FF6B5E]"
                      : e.kind === "score"
                        ? "text-[#B7A6FF]"
                        : e.kind === "match"
                          ? "text-[#FFC7A6]"
                          : "text-white/85"
                  }
                >
                  {e.message}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
