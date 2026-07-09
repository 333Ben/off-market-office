import { useEffect, useRef, useState } from "react";

// Animated SVG ring — sweeps from 0 to the score on mount (§12). Reduced-motion
// users get the final value with no sweep.
export default function UrgencyRing({
  value,
  color,
  size = 96,
  stroke = 8,
  label = true,
}: {
  value: number;
  color: string;
  size?: number;
  stroke?: number;
  label?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const [shown, setShown] = useState(prefersReduced ? pct : 0);
  const raf = useRef<number>();

  useEffect(() => {
    if (prefersReduced) {
      setShown(pct);
      return;
    }
    setShown(0);
    const start = performance.now();
    const dur = 700;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(pct * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [pct, prefersReduced]);

  const offset = c * (1 - shown / 100);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      title={`Urgency ${pct}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      {label && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="tnum font-700 leading-none text-ink"
            style={{ fontSize: size * 0.28 }}
          >
            {Math.round(shown)}
          </span>
          <span className="text-[10px] font-500 uppercase tracking-wide text-muted">
            urgency
          </span>
        </div>
      )}
    </div>
  );
}

// Compact conic ring for pin hover mini-cards (no sweep needed at that size).
export function MiniRing({ value, color }: { value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(${color} ${pct * 3.6}deg, var(--border) 0deg)`,
      }}
      title={`Urgency ${pct}`}
    >
      <div className="grid h-7 w-7 place-items-center rounded-full bg-card">
        <span className="tnum text-[11px] font-700 text-ink">{pct}</span>
      </div>
    </div>
  );
}
