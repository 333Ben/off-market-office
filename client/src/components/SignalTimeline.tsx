import type { Signal } from "../types";
import { SIGNAL_META, SOURCE_STYLE, relativeTime } from "../lib/signals";

export default function SignalTimeline({ signals }: { signals: Signal[] }) {
  if (signals.length === 0) {
    return (
      <p className="text-sm text-muted">No signals detected yet.</p>
    );
  }
  const ordered = [...signals].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <ol className="flex flex-col gap-3">
      {ordered.map((s) => {
        const meta = SIGNAL_META[s.type];
        const src = SOURCE_STYLE[s.source];
        const Icon = meta.icon;
        return (
          <li key={s.id} className="flex gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-chip bg-page text-secondary">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-600 text-ink">
                  {s.title}
                </span>
                <span
                  className="ml-auto shrink-0 rounded-[6px] px-1.5 py-0.5 text-[10px] font-600 uppercase tracking-wide"
                  style={{ background: src.bg, color: src.fg }}
                >
                  {src.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-secondary">{s.detail}</p>
              <span className="mt-1 block text-[11px] text-muted">
                {relativeTime(s.timestamp)}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
