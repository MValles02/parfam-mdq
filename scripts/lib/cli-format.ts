/** Console formatting shared by the reference-data CLI scripts. */

/** Thousands-separated count, in the store's es-AR locale (e.g. "140.228"). */
export function formatCount(n: number): string {
  return n.toLocaleString("es-AR");
}

/** Seconds since `startedAt` (a `Date.now()` value), with one decimal. */
export function elapsedSeconds(startedAt: number): string {
  return ((Date.now() - startedAt) / 1000).toFixed(1);
}

/** "<n> brands, <n> perfumers, <n> notes, <n> accords", as the importer reports each stage. */
export function formatDimensionCounts(counts: {
  brands: number;
  perfumers: number;
  notes: number;
  accords: number;
}): string {
  return `${formatCount(counts.brands)} brands, ${formatCount(counts.perfumers)} perfumers, ${formatCount(counts.notes)} notes, ${formatCount(counts.accords)} accords`;
}

/** Summary line both the importer and the coverage check print after a dataset scan. */
export function formatYearOutOfRangeSummary(count: number): string {
  return `  ${formatCount(count)} registros con año fuera de rango se importan sin año`;
}
