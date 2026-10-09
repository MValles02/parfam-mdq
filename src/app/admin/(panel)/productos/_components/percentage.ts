/**
 * Reads a 0..100 value typed into a digits-only input: non-digits are
 * dropped, at most three digits are kept, and the result is capped at 100.
 * Returns null when no digits remain, so callers decide what "empty" means.
 */
export function parsePercentageInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, "").slice(0, 3);
  return digits === "" ? null : Math.min(100, Number(digits));
}
