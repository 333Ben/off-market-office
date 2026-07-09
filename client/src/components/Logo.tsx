import { useId } from "react";

// OMO — Off Market Office. The mark is a match arc between a violet demand pin
// and a coral supply pin (the product in one glyph). Colors come from the
// design tokens so the logo always tracks the app palette.
export default function LogoMark({ size = 26 }: { size?: number }) {
  const gid = "omo-" + useId().replace(/:/g, "");
  const W = 120;
  const H = 64;
  return (
    <svg
      width={size}
      height={(size * H) / W}
      viewBox="0 30 120 64"
      fill="none"
      role="img"
      aria-label="OMO — Off Market Office"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--violet)" />
          <stop offset="100%" stopColor="var(--coral)" />
        </linearGradient>
      </defs>
      <path
        d="M14 74 Q60 6 106 74"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx="14" cy="74" r="13" fill="var(--violet)" />
      <circle cx="14" cy="74" r="13" fill="none" stroke="#fff" strokeWidth="3" />
      <circle cx="106" cy="74" r="13" fill="var(--coral)" />
      <circle cx="106" cy="74" r="13" fill="none" stroke="#fff" strokeWidth="3" />
    </svg>
  );
}
