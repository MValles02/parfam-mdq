/**
 * Pure helpers for scripts/import-references.ts: dimension aggregation
 * (brand/perfumer/note-family "most frequent casing wins", see
 * scripts/lib/slug-frequency.ts), the FragranceRef row shape shared by both
 * the create and update paths of the importer's second pass, and the
 * relation and dimension rows each batch writes.
 *
 * Like scripts/lib/reference-parse.ts, this module does no database, file,
 * or network I/O and never imports the generated Prisma client, so it stays
 * usable from the importer scripts without a live database or `prisma generate`.
 */

import type { Gender, NotePosition, ParsedReference } from "./reference-parse";
import type { ReferenceTranslations } from "./reference-translations";
import { SlugFrequencyTracker } from "./slug-frequency";

/** A Brand or Perfumer row: both are keyed by slug and carry only a display name. */
interface NamedDimension {
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

  get brands(): NamedDimension[] {
    return this.brandNames
      .slugs()
      .map((slug) => ({ slug, name: this.brandNames.mostFrequent(slug) }));
  }

  get perfumers(): NamedDimension[] {
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

/** Looks up the Brand row id the dimension upserts created for this record's brand slug. */
export function resolveBrandId(
  record: ParsedReference,
  brandIdBySlug: ReadonlyMap<string, string>,
): string {
  const brandId = brandIdBySlug.get(record.brandSlug);
  if (!brandId) {
    throw new Error(
      `Unresolved brand "${record.brandName}" (pid ${record.pid}).`,
    );
  }
  return brandId;
}

/**
 * Maps every pid in the batch to its FragranceRef id: the id of the row that
 * already existed when there is one, otherwise the id of the row the batch
 * just created.
 */
export function resolveRefIdByPid(
  batch: readonly ParsedReference[],
  existingIdByPid: ReadonlyMap<number, string>,
  createdIdByPid: ReadonlyMap<number, string>,
): Map<number, string> {
  const refIdByPid = new Map<number, string>();
  for (const record of batch) {
    const id =
      existingIdByPid.get(record.pid) ?? createdIdByPid.get(record.pid);
    if (!id) {
      throw new Error(
        `FragranceRef for pid ${record.pid} was neither found nor created.`,
      );
    }
    refIdByPid.set(record.pid, id);
  }
  return refIdByPid;
}

interface FragranceRefNoteRow {
  fragranceRefId: string;
  noteId: string;
  position: NotePosition | null;
  weight: number;
  sortOrder: number;
}

interface FragranceRefAccordRow {
  fragranceRefId: string;
  accordId: string;
  strength: number;
  sortOrder: number;
}

interface FragranceRefPerfumerRow {
  fragranceRefId: string;
  perfumerId: string;
}

interface FragranceRefRelationRows {
  notes: FragranceRefNoteRow[];
  accords: FragranceRefAccordRow[];
  perfumers: FragranceRefPerfumerRow[];
}

/** Dimension row ids by slug, read back from the database after the dimension upserts. */
export interface RelationDimensionIds {
  noteIdBySlug: ReadonlyMap<string, string>;
  accordIdBySlug: ReadonlyMap<string, string>;
  perfumerIdBySlug: ReadonlyMap<string, string>;
}

/**
 * Builds the note, accord, and perfumer relation rows for every record in
 * the batch, in record order. Every slug must resolve: the translation gate
 * and the dimension upserts guarantee it, so a miss is an importer bug and
 * throws.
 */
export function buildRelationRows(
  batch: readonly ParsedReference[],
  refIdByPid: ReadonlyMap<number, string>,
  ids: RelationDimensionIds,
): FragranceRefRelationRows {
  const rows: FragranceRefRelationRows = {
    notes: [],
    accords: [],
    perfumers: [],
  };
  for (const record of batch) {
    const fragranceRefId = refIdByPid.get(record.pid)!;
    for (const note of record.notes) {
      const noteId = ids.noteIdBySlug.get(note.noteSlug);
      if (!noteId) {
        throw new Error(
          `Unresolved note "${note.name}" (pid ${record.pid}); the translation gate should have prevented this.`,
        );
      }
      rows.notes.push({
        fragranceRefId,
        noteId,
        position: note.position,
        weight: note.weight,
        sortOrder: note.sortOrder,
      });
    }
    for (const accord of record.accords) {
      const accordId = ids.accordIdBySlug.get(accord.slug);
      if (!accordId) {
        throw new Error(
          `Unresolved accord "${accord.name}" (pid ${record.pid}); the translation gate should have prevented this.`,
        );
      }
      rows.accords.push({
        fragranceRefId,
        accordId,
        strength: accord.strength,
        sortOrder: accord.sortOrder,
      });
    }
    for (const perfumer of record.perfumers) {
      const perfumerId = ids.perfumerIdBySlug.get(perfumer.slug);
      if (!perfumerId) {
        throw new Error(
          `Unresolved perfumer "${perfumer.name}" (pid ${record.pid}); pass 1 should have aggregated it.`,
        );
      }
      rows.perfumers.push({ fragranceRefId, perfumerId });
    }
  }
  return rows;
}

export interface NoteDimensionRow {
  slug: string;
  nameEn: string;
  nameEs: string;
  family: string;
}

export interface AccordDimensionRow {
  slug: string;
  nameEn: string;
  nameEs: string;
  color: string;
}

/**
 * Note rows to upsert, one per note slug the dataset uses. The importer only
 * calls this after the translation gate verified every slug has an entry in
 * `translations.notes`.
 */
export function buildNoteDimensionRows(
  aggregator: ReferenceDimensionAggregator,
  translations: ReferenceTranslations,
): NoteDimensionRow[] {
  return aggregator.noteSlugs.map((slug) => {
    const translation = translations.notes.get(slug)!;
    return {
      slug,
      nameEn: translation.en,
      nameEs: translation.es,
      family: aggregator.familyFor(slug),
    };
  });
}

/** Accord rows to upsert; same translation-gate precondition as `buildNoteDimensionRows`. */
export function buildAccordDimensionRows(
  aggregator: ReferenceDimensionAggregator,
  translations: ReferenceTranslations,
): AccordDimensionRow[] {
  return aggregator.accordSlugs.map((slug) => {
    const translation = translations.accords.get(slug)!;
    return {
      slug,
      nameEn: translation.en,
      nameEs: translation.es,
      color: translation.color,
    };
  });
}
