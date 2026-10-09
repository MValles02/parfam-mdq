/**
 * Builds the `--emit-missing` output of scripts/check-reference-translations.ts:
 * a JSON skeleton of every note and accord slug the dataset uses that has no
 * Spanish translation yet, ready for a translator to fill in.
 */
import type { SlugFrequencyTracker } from "./slug-frequency";
import type { MissingTranslationsReport } from "./reference-translations";

/** Descending by total occurrences, so translators tackle the common slugs first; ties broken alphabetically for a stable, reviewable diff. */
export function sortByDescendingFrequency(
  slugs: string[],
  frequency: SlugFrequencyTracker,
): string[] {
  return [...slugs].sort((a, b) => {
    const diff = frequency.total(b) - frequency.total(a);
    return diff !== 0 ? diff : a.localeCompare(b);
  });
}

interface MissingTranslationsSkeleton {
  notes: Record<string, { en: string; es: string }>;
  accords: Record<string, { en: string; es: string; color: string }>;
  _counts: {
    notes: Record<string, number>;
    accords: Record<string, number>;
  };
}

/**
 * Lists the missing entries in the exact per-entry shape
 * prisma/reference/{notes,accords}.es.json expect (so a filled-in section can
 * be pasted straight into the real file), with `en` set to the most frequent
 * display name, plus a `_counts` section with occurrence totals. Occurrence
 * counts are deliberately kept out of the per-entry shape: notes.es.json and
 * accords.es.json only ever hold `{en, es}` / `{en, es, color}`, so a `count`
 * field there would fail the file's own schema.
 */
export function buildMissingTranslationsSkeleton(
  report: MissingTranslationsReport,
  noteFrequency: SlugFrequencyTracker,
  accordFrequency: SlugFrequencyTracker,
): MissingTranslationsSkeleton {
  const sortedMissingNotes = sortByDescendingFrequency(
    report.missingNotes,
    noteFrequency,
  );
  const sortedMissingAccords = sortByDescendingFrequency(
    report.missingAccords,
    accordFrequency,
  );

  const notes: MissingTranslationsSkeleton["notes"] = {};
  const noteCounts: Record<string, number> = {};
  for (const slug of sortedMissingNotes) {
    notes[slug] = { en: noteFrequency.mostFrequent(slug), es: "" };
    noteCounts[slug] = noteFrequency.total(slug);
  }

  const accords: MissingTranslationsSkeleton["accords"] = {};
  const accordCounts: Record<string, number> = {};
  for (const slug of sortedMissingAccords) {
    accords[slug] = {
      en: accordFrequency.mostFrequent(slug),
      es: "",
      color: "",
    };
    accordCounts[slug] = accordFrequency.total(slug);
  }

  return {
    notes,
    accords,
    _counts: { notes: noteCounts, accords: accordCounts },
  };
}
