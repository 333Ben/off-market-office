// Paris arrondissement centroids + deterministic jitter, used to place both the
// synthetic seed and imported BODACC companies on the map. All points are kept
// inside the demo bounds (lat 48.83–48.90, lng 2.28–2.41).

export const ARR_CENTER: Record<number, [number, number]> = {
  1: [48.8626, 2.3363],
  2: [48.8688, 2.3419],
  3: [48.863, 2.36],
  4: [48.8546, 2.3574],
  5: [48.8448, 2.3471],
  6: [48.8496, 2.3339],
  7: [48.857, 2.312],
  8: [48.8726, 2.315],
  9: [48.8768, 2.3396],
  10: [48.876, 2.3599],
  11: [48.8594, 2.3765],
  12: [48.841, 2.3876],
  13: [48.836, 2.362],
  14: [48.8331, 2.3264],
  15: [48.8412, 2.3],
  16: [48.8637, 2.285],
  17: [48.8848, 2.3213],
  18: [48.8925, 2.3444],
  19: [48.8827, 2.3822],
  20: [48.8639, 2.3984],
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

/** Deterministic point within an arrondissement (seed drives the jitter). */
export function jitter(arr: number, seed: number): [number, number] {
  const [lat, lng] = ARR_CENTER[arr] ?? [48.8656, 2.345];
  const a = ((seed * 53) % 17) / 17 - 0.5;
  const b = ((seed * 29) % 13) / 13 - 0.5;
  return [
    +clamp(lat + a * 0.012, 48.831, 48.899).toFixed(5),
    +clamp(lng + b * 0.016, 2.281, 2.409).toFixed(5),
  ];
}
