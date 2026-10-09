/**
 * Pure helpers for scripts/import-references.ts: dimension aggregation
 * (brand/perfumer/note-family "most frequent casing wins", matching how
 * scripts/check-reference-translations.ts already picks a canonical display
 * name) and the FragranceRef row shape shared by both the create and update
 * paths of the importer's second pass.
 *
 * Like scripts/lib/reference-parse.ts, this module does no database, file,
 * or network I/O and never imports the generated Prisma client, so it stays
 * usable from the importer scripts without a live database or `prisma generate`.
 */

import type { Gender, ParsedReference } from "./reference-parse";

/**
 * Tracks, per slug, how many times each exact display-name (or family, for
 * notes) string occurred across the dataset, and picks the most frequent one
 * as the canonical value written to the dimension table. The dataset does
 * not normalize casing (e.g. a brand appearing as both "L'Oréal" and
 * "L'OREAL"), so picking anything other than "most common wins" would make
 * the imported name depend on iteration order rather than the data itself.
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

interface BrandDimension {
  slug: string;
  name: string;
}

interface PerfumerDimension {
  slug: string;
  name: string;
}

/**
 * Incrementally aggregates the Brand, Perfumer, Note, and Accord dimensions
 * from a stream of parsed records, without holding the records themselves in
 * memory. `add` is called once per record as the importer streams
 * new-database/perfumes.jsonl (see scripts/import-references.ts), and the
 * getters below are read only after every record has been added.
 */
export class ReferenceDimensionAggregator {
  private readonly brandNames = new SlugFrequencyTracker();
  private readonly perfumerNames = new SlugFrequencyTracker();
  private readonly noteFamilies = new SlugFrequencyTracker();
  private readonly accordSlugsSeen = new Set<string>();

  add(record: ParsedReference): void {
    this.brandNames.record(record.brandSlug, record.brandName);
    for (const perfumer of record.perfumers) {
      this.perfumerNames.record(perfumer.slug, perfumer.name);
    }
    for (const note of record.notes) {
      this.noteFamilies.record(note.noteSlug, note.family);
    }
    for (const accord of record.accords) {
      this.accordSlugsSeen.add(accord.slug);
    }
  }

  get brands(): BrandDimension[] {
    return this.brandNames
      .slugs()
      .map((slug) => ({ slug, name: this.brandNames.mostFrequent(slug) }));
  }

  get perfumers(): PerfumerDimension[] {
    return this.perfumerNames
      .slugs()
      .map((slug) => ({ slug, name: this.perfumerNames.mostFrequent(slug) }));
  }

  get noteSlugs(): string[] {
    return this.noteFamilies.slugs();
  }

  /** The dataset's most frequent family slug for this note; throws if the note slug was never seen, since that indicates a caller bug rather than missing data. */
  familyFor(noteSlug: string): string {
    return this.noteFamilies.mostFrequent(noteSlug);
  }

  get accordSlugs(): string[] {
    return [...this.accordSlugsSeen];
  }
}

/**
 * Denormalized admin search text: "<name> <brand>".
 * Normalization for matching (accents, case) happens at query time through
 * the `parfam_normalize` SQL function backing the GIN trigram index (see
 * prisma/migrations/20260921225316_initial_schema/migration.sql), not here.
 */
export function buildSearchText(name: string, brandName: string): string {
  return `${name} ${brandName}`;
}

/**
 * The scalar columns of one FragranceRef row, shared by both the "create a
 * new pid" and "update an existing pid in place" paths of
 * scripts/import-references.ts. Keeping a single shape for both means a
 * rerun with fresher dataset values (e.g. more community votes) updates a
 * row exactly the same way a first import would have written it.
 */
export interface FragranceRefRow {
  pid: number;
  slug: string;
  name: string;
  brandId: string;
  year: number | null;
  gender: Gender | null;
  collection: string | null;
  descriptionEn: string | null;
  longevity: number | null;
  sillage: number | null;
  seasonSpringVotes: number | null;
  seasonSummerVotes: number | null;
  seasonFallVotes: number | null;
  seasonWinterVotes: number | null;
  daypartDayVotes: number | null;
  daypartNightVotes: number | null;
  communityVotes: number | null;
  popularity: number | null;
  scrapedAt: Date | null;
  searchText: string;
}

export function buildFragranceRefRow(
  record: ParsedReference,
  brandId: string,
): FragranceRefRow {
  return {
    pid: record.pid,
    slug: record.recordSlug,
    name: record.name,
    brandId,
    year: record.year,
    gender: record.gender,
    collection: record.collection,
    descriptionEn: record.descriptionEn,
    longevity: record.longevity,
    sillage: record.sillage,
    seasonSpringVotes: record.seasonVotes?.spring ?? null,
    seasonSummerVotes: record.seasonVotes?.summer ?? null,
    seasonFallVotes: record.seasonVotes?.autumn ?? null,
    seasonWinterVotes: record.seasonVotes?.winter ?? null,
    daypartDayVotes: record.daypartVotes?.day ?? null,
    daypartNightVotes: record.daypartVotes?.night ?? null,
    communityVotes: record.communityVotes,
    popularity: record.popularity,
    scrapedAt: record.scrapedAt,
    searchText: buildSearchText(record.name, record.brandName),
  };
}
