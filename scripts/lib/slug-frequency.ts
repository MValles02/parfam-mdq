/**
 * Tracks, per slug, how many times each exact string value (a display name,
 * or a note's family) occurred across the dataset, and picks the most
 * frequent one as the canonical value. The dataset does not normalize casing
 * (e.g. a brand appearing as both "L'Oréal" and "L'OREAL"), so picking
 * anything other than "most common wins" would make the result depend on
 * iteration order rather than the data itself.
 *
 * The importer uses it for the names and families it writes to the dimension
 * tables (see scripts/lib/reference-import.ts); the translation-coverage
 * check uses it for the `en` name it suggests for an untranslated slug (see
 * scripts/check-reference-translations.ts), so both pick the same name.
 */
export class SlugFrequencyTracker {
  private readonly valuesBySlug = new Map<string, Map<string, number>>();

  record(slug: string, value: string): void {
    let values = this.valuesBySlug.get(slug);
    if (!values) {
      values = new Map();
      this.valuesBySlug.set(slug, values);
    }
    values.set(value, (values.get(value) ?? 0) + 1);
  }

  slugs(): string[] {
    return [...this.valuesBySlug.keys()];
  }

  /** Total occurrences of the slug, across every distinct value seen for it. */
  total(slug: string): number {
    const values = this.valuesBySlug.get(slug);
    if (!values) return 0;
    let total = 0;
    for (const count of values.values()) total += count;
    return total;
  }

  /** The single most frequently seen value for this slug; ties keep whichever value was recorded first, for a deterministic result independent of Map iteration quirks. */
  mostFrequent(slug: string): string {
    const values = this.valuesBySlug.get(slug);
    if (!values || values.size === 0) {
      throw new Error(`No value was ever recorded for slug "${slug}".`);
    }
    let best: { value: string; count: number } | null = null;
    for (const [value, count] of values) {
      if (best === null || count > best.count) best = { value, count };
    }
    return best!.value;
  }
}
