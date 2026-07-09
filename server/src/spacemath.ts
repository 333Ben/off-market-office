// Deterministic capacity math (§8). Numbers are NEVER invented by the LLM —
// they are computed here so the demo stays coherent and reproducible.

/** French office norm ≈ 10 m² / person. */
export function deskCapacity(officeSqm: number): number {
  return Math.round(officeSqm / 10);
}

/**
 * Months until the team outgrows its desks.
 * null = already over capacity (headcount ≥ desks) or not hiring.
 */
export function monthsToBreach(
  capacityDesks: number,
  headcount: number,
  hiresPerMonth: number
): number | null {
  if (hiresPerMonth <= 0) return null;
  if (headcount >= capacityDesks) return null; // over capacity
  const months = (capacityDesks - headcount) / hiresPerMonth;
  return Math.max(0, Math.round(months * 10) / 10);
}

/**
 * Space the team will need once current open roles are filled.
 * neededSqm = round(headcount + openRoles * 0.7) * 10  (rounded to 10 m²).
 */
export function neededSqm(headcount: number, openRoles: number): number {
  return Math.round((headcount + openRoles * 0.7) * 10 / 10) * 10;
}
