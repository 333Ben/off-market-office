import { useEffect, useMemo, useState } from "react";
import { Polyline, Marker } from "react-leaflet";
import L from "leaflet";
import { useStore, type ActiveMatch } from "../store";
import { VIOLET, CORAL } from "../lib/format";

type LL = [number, number];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function lerpColor(t: number): string {
  const c1 = [108, 92, 231]; // violet
  const c2 = [255, 90, 95]; // coral
  const r = Math.round(lerp(c1[0], c2[0], t));
  const g = Math.round(lerp(c1[1], c2[1], t));
  const b = Math.round(lerp(c1[2], c2[2], t));
  return `rgb(${r},${g},${b})`;
}

// Quadratic bézier from p0 → p1 with a lifted control point for the arc.
function bezierPoints(p0: LL, p1: LL, n: number): LL[] {
  const mid: LL = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const perp: LL = [-dy, dx];
  const ctrl: LL = [mid[0] + perp[0] * 0.28, mid[1] + perp[1] * 0.28];
  const pts: LL[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const mt = 1 - t;
    pts.push([
      mt * mt * p0[0] + 2 * mt * t * ctrl[0] + t * t * p1[0],
      mt * mt * p0[1] + 2 * mt * t * ctrl[1] + t * t * p1[1],
    ]);
  }
  return pts;
}

const SEGMENTS = 24;

export default function MatchArc({ match }: { match: ActiveMatch }) {
  const companies = useStore((s) => s.companies);
  const out = companies.find((c) => c.id === match.outgrowerId);
  const rel = companies.find((c) => c.id === match.releaserId);

  const points = useMemo(() => {
    if (!out || !rel) return null;
    return bezierPoints([out.lat, out.lng], [rel.lat, rel.lng], SEGMENTS);
  }, [out, rel]);

  // Draw-in: reveal segments over ~800ms (skipped under reduced motion).
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [shown, setShown] = useState(reduced ? SEGMENTS : 0);

  useEffect(() => {
    if (reduced) {
      setShown(SEGMENTS);
      return;
    }
    setShown(0);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 800);
      setShown(Math.round(t * SEGMENTS));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [match.outgrowerId, match.releaserId, reduced]);

  if (!points || !out || !rel) return null;

  const apex = points[Math.floor(SEGMENTS / 2)];
  const chip = L.divIcon({
    className: "match-chip",
    html: `<div style="
      transform:translate(-50%,-50%);white-space:nowrap;
      background:#17171F;color:#fff;font-weight:700;font-size:12px;
      padding:3px 8px;border-radius:9999px;box-shadow:0 4px 12px rgba(23,23,31,.35);
      font-variant-numeric:tabular-nums;">Match ${match.score}</div>`,
    iconSize: [0, 0],
  });

  return (
    <>
      {points.slice(0, Math.max(1, shown)).map((p, i) => {
        const next = points[i + 1];
        if (!next) return null;
        return (
          <Polyline
            key={i}
            positions={[p, next]}
            pathOptions={{
              color: lerpColor(i / SEGMENTS),
              weight: 3.5,
              opacity: 0.95,
              lineCap: "round",
            }}
          />
        );
      })}
      {shown >= SEGMENTS && (
        <Marker position={apex} icon={chip} interactive={false} />
      )}
    </>
  );
}
