/**
 * Pure parser for new-database/perfumes.jsonl records — the Fragrantica
 * reference-catalog dump (see new-database/SCHEMA.md, gitignored and
 * local-only, for the full record shape). This module does no database,
 * file, or network I/O: it takes already-parsed JSON in and returns typed,
 * normalized data out, so both the importer and the
 * translation-coverage script can reuse it without a live database.
 *
 * Only a subset of each record is kept. Dropped on purpose: `url`,
 * `picture`, `thumbnail` (derivable from `id` + `slug`, see SCHEMA.md),
 * `rating`, every histogram, `price_value`, `relation`, `community_gender`,
 * `ai_summary`, `similar`, and the extra `popularity` sub-fields, plus
 * `image_id` on perfumers and notes (Fragrantica's own portrait/icon
 * assets, irrelevant to this project). Zod strips any other unknown key by
 * default, so the schema below only needs to name what it keeps.
 */

import { z } from "zod";
import { toSlug } from "../../src/lib/slug";

export { toSlug };

/**
 * Mirrors the Prisma `Gender` and `NotePosition` enums (prisma/schema.prisma)
 * as local string unions instead of importing them. Importing the generated
 * Prisma client (directly, or transitively through another module) would tie
 * this file to `prisma generate` having run, which a pure parser and the
 * importer scripts should not depend on.
 */
export type Gender = "WOMEN" | "MEN" | "UNISEX";
export type NotePosition = "TOP" | "MIDDLE" | "BASE";

/**
 * A note's identity, for deduplication purposes, is its own display name —
 * not the dataset's "family" slug (kept separately, see `ParsedNote.family`
 * below). Two different display names can share a family (e.g. "Calabrian
 * bergamot" and "Sicilian Bergamot" both carry the family slug "Bergamot"),
 * and collapsing them into one note would silently discard the distinction
 * an administrator may care about when writing the Spanish product copy.
 */
export function toNoteSlug(name: string): string {
  return toSlug(name.trim().toLowerCase());
}

/**
 * `slug` on a raw record is "Brand-Segment/Name-Segment" and is NOT unique
 * across the dataset: two different perfumes sharing a name under the same
 * brand (e.g. a flanker with an identical title) can produce the same
 * record slug, and Fragrantica disambiguates with the numeric `id`, not the
 * slug. This function only recovers the brand half, for grouping.
 */
export function brandSlugFromRecordSlug(slug: string): string {
  const [brandSegment] = slug.split("/");
  return toSlug(brandSegment ?? "");
}

/** Maps the dataset's official gender label to the Prisma enum; anything unrecognized (including a future label this parser doesn't know about) becomes `null` rather than guessed. */
export function mapGender(value: string | null | undefined): Gender | null {
  if (value === "male") return "MEN";
  if (value === "female") return "WOMEN";
  if (value === "unisex") return "UNISEX";
  return null;
}

const perfumerRecordSchema = z.object({
  name: z.string(),
  slug: z.string(),
});

const accordRecordSchema = z.object({
  name: z.string(),
  strength: z.number(),
});

const noteItemRecordSchema = z.object({
  name: z.string(),
  slug: z.string(),
  weight: z.number(),
});

const tieredNotesSchema = z.object({
  top: z.array(noteItemRecordSchema).default([]),
  middle: z.array(noteItemRecordSchema).default([]),
  base: z.array(noteItemRecordSchema).default([]),
});

function emptyTiered(): { top: []; middle: []; base: [] } {
  return { top: [], middle: [], base: [] };
}

const notesRecordSchema = z.object({
  tiered: tieredNotesSchema.default(emptyTiered),
  flat: z.array(noteItemRecordSchema).default([]),
});

/**
 * Only `average` is kept from longevity/sillage/popularity; their
 * histograms and other sub-fields are out of scope for this parser.
 */
const averageMetricSchema = z.object({
  average: z.number().nullable(),
});

const seasonVotesSchema = z.object({
  winter: z.number(),
  spring: z.number(),
  summer: z.number(),
  autumn: z.number(),
});

const daypartVotesSchema = z.object({
  day: z.number(),
  night: z.number(),
});

const popularityRecordSchema = z.object({
  magnitude: z.number().nullable(),
});

const metaRecordSchema = z.object({
  scraped_at: z.number().nullable().default(null),
});

/**
 * Covers only the fields this project keeps from a perfumes.jsonl record.
 *
 * `id` is typed as a bare `z.number()`, not `.int().positive()`, on purpose:
 * that keeps "the record doesn't match the schema at all" (a missing/wrong
 * -typed field) and "the record has a nonsensical id" (checked explicitly in
 * `parseReferenceRecord`) as two distinguishable failures instead of one.
 */
const referenceRecordSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  brand: z.string(),
  year: z.number().nullable().default(null),
  gender: z.string().nullable().default(null),
  collection: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  perfumers: z.array(perfumerRecordSchema).default([]),
  accords: z.array(accordRecordSchema).default([]),
  notes: notesRecordSchema.default(() => ({ tiered: emptyTiered(), flat: [] })),
  // The vote aggregates below come from one encrypted blob upstream and go
  // null together when it is absent (see new-database/SCHEMA.md); each is
  // independently nullable here to match that.
  longevity: averageMetricSchema.nullable().default(null),
  sillage: averageMetricSchema.nullable().default(null),
  seasons: seasonVotesSchema.nullable().default(null),
  daypart: daypartVotesSchema.nullable().default(null),
  people: z.number().nullable().default(null),
  popularity: popularityRecordSchema.nullable().default(null),
  meta: metaRecordSchema.default({ scraped_at: null }),
});

type ReferenceRecord = z.infer<typeof referenceRecordSchema>;

interface ParsedPerfumer {
  name: string;
  slug: string;
}

interface ParsedAccord {
  name: string;
  slug: string;
  strength: number;
  sortOrder: number;
}

interface ParsedNote {
  name: string;
  noteSlug: string;
  /** The dataset's own note slug, kept as given (e.g. "Bergamot"); several display names can share one family, see `toNoteSlug`. */
  family: string;
  position: NotePosition | null;
  /**
   * 0..100, normalized so the perfume's strongest note is 100. A note at
   * weight 0 is not "faint" — every note in the pyramid sits at 0 exactly
   * when nobody has voted on this perfume's ingredients yet, so a record's
   * all-zero weights are preserved rather than treated as missing data.
   */
  weight: number;
  sortOrder: number;
}

interface SeasonVotes {
  winter: number;
  spring: number;
  summer: number;
  autumn: number;
}

interface DaypartVotes {
  day: number;
  night: number;
}

export interface ParsedReference {
  pid: number;
  /** Raw "Brand/Perfume" record slug; see `brandSlugFromRecordSlug` for why it is not unique. */
  recordSlug: string;
  name: string;
  brandName: string;
  brandSlug: string;
  year: number | null;
  gender: Gender | null;
  collection: string | null;
  descriptionEn: string | null;
  perfumers: ParsedPerfumer[];
  accords: ParsedAccord[];
  notes: ParsedNote[];
  longevity: number | null;
  sillage: number | null;
  seasonVotes: SeasonVotes | null;
  daypartVotes: DaypartVotes | null;
  communityVotes: number | null;
  popularity: number | null;
  scrapedAt: Date | null;
  /**
   * Non-fatal issues found while parsing this record, in prose (e.g. a year
   * outside the plausible range, normalized to `null` rather than aborting
   * the import). `parseReferenceRecord` always sets this to an array, empty
   * when the record had no warnings; it is typed optional only so that
   * hand-built `ParsedReference` fixtures elsewhere (e.g.
   * scripts/lib/reference-import.test.ts) do not have to name it. Callers
   * reading a real parsed record (see scripts/import-references.ts and
   * scripts/check-reference-translations.ts) should still guard with `?? []`
   * to keep that distinction honest at the type level.
   */
  warnings?: string[];
}

/** Trims a nullable text field; an empty result becomes `null` rather than a persisted empty string. */
function nullableText(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Weights and accord strengths are both documented as integers 0..100. */
function assertUnitScore(
  value: number,
  kind: "weight" | "strength",
  pid: number,
): void {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new Error(
      `Reference record ${pid}: ${kind} must be an integer between 0 and 100, got ${value}.`,
    );
  }
}

/**
 * The perfumer slug comes from the dataset's own `perfumers[].slug` (e.g.
 * "Nathalie_Feisthauer"), not from re-slugifying the display name: keeping
 * the dataset's identity key is what lets two credits with different display
 * casing or accents still resolve to the same Perfumer row. That dataset
 * slug is not itself a clean URL slug, though — measuring it against the
 * real 140k-record dataset (see scripts/import-references.ts) found two
 * quirks `toSlug` alone does not undo: words are separated with `_` instead
 * of `-` (so "Nathalie_Feisthauer" would slugify to "nathaliefeisthauer",
 * losing the word boundary), and any non-ASCII character is left as an
 * undecoded percent-escape rather than the actual UTF-8 character (e.g.
 * "Sophie_Labb%C3%A9" for "Sophie Labbé", which `toSlug` would otherwise turn
 * into the unreadable "sophielabbpercentc3percenta9"). `normalizePerfumerSlug`
 * percent-decodes the raw slug (falling back to the raw string if the escape
 * itself is malformed, e.g. a stray "%ZZ") and turns `_` into a space before
 * handing the result to `toSlug`. Falls back to `toSlug(name)` when the
 * dataset slug is empty, or when normalizing it yields an empty string.
 */
function normalizePerfumerSlug(datasetSlug: string, name: string): string {
  const trimmed = datasetSlug.trim();
  if (trimmed === "") return toSlug(name);
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    // Malformed percent-escape (e.g. "Bad%ZZ"): keep the raw slug rather
    // than letting a corrupt dataset value abort the whole import.
  }
  const slug = toSlug(decoded.replace(/_/g, " "));
  return slug !== "" ? slug : toSlug(name);
}

function parsePerfumers(raw: ReferenceRecord["perfumers"]): ParsedPerfumer[] {
  const seenSlugs = new Set<string>();
  const result: ParsedPerfumer[] = [];
  for (const perfumer of raw) {
    const name = perfumer.name.trim();
    const slug = normalizePerfumerSlug(perfumer.slug, name);
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    result.push({ name, slug });
  }
  return result;
}

function parseAccords(
  raw: ReferenceRecord["accords"],
  pid: number,
): ParsedAccord[] {
  const seenSlugs = new Set<string>();
  const result: ParsedAccord[] = [];
  raw.forEach((accord, index) => {
    assertUnitScore(accord.strength, "strength", pid);
    const name = accord.name.trim();
    const slug = toSlug(name);
    if (seenSlugs.has(slug)) return;
    seenSlugs.add(slug);
    result.push({ name, slug, strength: accord.strength, sortOrder: index });
  });
  return result;
}

function parseNoteItems(
  items: ReferenceRecord["notes"]["flat"],
  position: NotePosition | null,
  pid: number,
): ParsedNote[] {
  const seenNoteSlugs = new Set<string>();
  const result: ParsedNote[] = [];
  items.forEach((item, index) => {
    assertUnitScore(item.weight, "weight", pid);
    const name = item.name.trim();
    const noteSlug = toNoteSlug(name);
    if (seenNoteSlugs.has(noteSlug)) return;
    seenNoteSlugs.add(noteSlug);
    result.push({
      name,
      noteSlug,
      family: item.slug,
      position,
      weight: item.weight,
      sortOrder: index,
    });
  });
  return result;
}

function parseNotes(raw: ReferenceRecord["notes"], pid: number): ParsedNote[] {
  const { tiered, flat } = raw;
  const hasTiered =
    tiered.top.length > 0 || tiered.middle.length > 0 || tiered.base.length > 0;
  const hasFlat = flat.length > 0;

  if (hasTiered && hasFlat) {
    throw new Error(
      `Reference record ${pid}: has both tiered and flat notes; the dataset documents these as mutually exclusive.`,
    );
  }

  if (hasFlat) return parseNoteItems(flat, null, pid);

  // Deduplication is scoped per tier (a fresh Set per parseNoteItems call),
  // matching the spec: duplicates of the same noteSlug within the SAME
  // position keep the first, but the same note can legitimately appear once
  // per tier (rare, but not a data error).
  return [
    ...parseNoteItems(tiered.top, "TOP", pid),
    ...parseNoteItems(tiered.middle, "MIDDLE", pid),
    ...parseNoteItems(tiered.base, "BASE", pid),
  ];
}

/** A count field (season/daypart vote, or community vote total) must be a whole number no lower than zero; a negative or fractional count signals corrupt source data rather than "no votes". */
function assertNonNegativeInt(value: number, kind: string, pid: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(
      `Reference record ${pid}: ${kind} must be a non-negative integer, got ${value}.`,
    );
  }
}

/**
 * `average` sits on a fixed community-rating scale (longevity 1..5, sillage
 * 1..4). The dataset uses an average of exactly 0 to mean "nobody has voted
 * yet", not "scored the lowest possible value" — 0 is not even inside either
 * scale. That placeholder must become `null` here so the store never renders
 * a fabricated rating; any other out-of-range value is corrupt data and
 * throws instead of being silently clamped or passed through.
 */
function normalizeAverageMetric(
  metric: { average: number | null } | null,
  range: { min: number; max: number },
  label: "longevity" | "sillage",
  pid: number,
): number | null {
  if (metric === null || metric.average === null) return null;
  const { average } = metric;
  if (average === 0) return null;
  if (average < range.min || average > range.max) {
    throw new Error(
      `Reference record ${pid}: ${label} average ${average} is outside the valid range [${range.min}, ${range.max}].`,
    );
  }
  return average;
}

/**
 * Season/daypart tallies come from the same encrypted vote blob as
 * longevity/sillage (see the comment on `referenceRecordSchema`). When the
 * community simply hasn't voted on seasonality (or day/night), every bucket
 * reads 0 rather than the blob being absent — so an all-zero tally means "no
 * votes", not "0% of voters chose every option", and must become `null`
 * before it reaches the store.
 */
function normalizeSeasonVotes(
  seasons: SeasonVotes | null,
  pid: number,
): SeasonVotes | null {
  if (seasons === null) return null;
  assertNonNegativeInt(seasons.winter, "seasons.winter", pid);
  assertNonNegativeInt(seasons.spring, "seasons.spring", pid);
  assertNonNegativeInt(seasons.summer, "seasons.summer", pid);
  assertNonNegativeInt(seasons.autumn, "seasons.autumn", pid);
  const total =
    seasons.winter + seasons.spring + seasons.summer + seasons.autumn;
  return total === 0 ? null : seasons;
}

/** Same "all-zero means no votes" rule as `normalizeSeasonVotes`, applied to the day/night tally. */
function normalizeDaypartVotes(
  daypart: DaypartVotes | null,
  pid: number,
): DaypartVotes | null {
  if (daypart === null) return null;
  assertNonNegativeInt(daypart.day, "daypart.day", pid);
  assertNonNegativeInt(daypart.night, "daypart.night", pid);
  const total = daypart.day + daypart.night;
  return total === 0 ? null : daypart;
}

/** `people` (the community-vote count) has no "zero means unset" ambiguity: 0 voters is a legitimate count, so it is kept as-is once validated. */
function normalizeCommunityVotes(
  people: number | null,
  pid: number,
): number | null {
  if (people === null) return null;
  assertNonNegativeInt(people, "people", pid);
  return people;
}

/**
 * `year` (Prisma `Int`) must be a whole number; a non-integer is a type
 * violation and still throws. Landing in a plausible release-year window is
 * a different kind of problem: the real dataset has a legitimate outlier at
 * pid 11417 (Santa Maria Novella's "Acqua di Colonia", year 1533 — that
 * Florentine pharmacy's own recipe dates to 1533) alongside two known
 * Fragrantica data-entry errors on otherwise-modern brands, pid 104363 (year
 * 20) and pid 92094 (year 1070). Aborting the whole 140k-record import over
 * two bad rows is worse than losing a year on two records, so an
 * out-of-range integer year is treated as "unknown" (`null`) with a warning
 * instead of thrown. `currentYear + 1` (rather than the current year) is the
 * upper bound to tolerate a perfume announced ahead of its release, which
 * Fragrantica does list occasionally; 1500 is the lower bound, the smallest
 * round number that keeps the one genuine 1533 case in.
 */
function normalizeYear(
  year: number | null,
  pid: number,
): { year: number | null; warning: string | null } {
  if (year === null) return { year: null, warning: null };
  if (!Number.isInteger(year)) {
    throw new Error(
      `Reference record ${pid}: year must be an integer, got ${year}.`,
    );
  }
  const minYear = 1500;
  const maxYear = new Date().getFullYear() + 1;
  if (year < minYear || year > maxYear) {
    return {
      year: null,
      warning: `Reference record ${pid}: year ${year} is outside the plausible range [${minYear}, ${maxYear}]; imported without a year.`,
    };
  }
  return { year, warning: null };
}

/**
 * `popularity.magnitude` (Prisma `Int`) backs the "most popular" sort (see
 * new-database/SCHEMA.md); it is derived upstream from vote counts, so it can
 * never be negative or fractional.
 */
function normalizePopularity(
  popularity: { magnitude: number | null } | null,
  pid: number,
): number | null {
  if (popularity === null || popularity.magnitude === null) return null;
  const { magnitude } = popularity;
  if (!Number.isInteger(magnitude) || magnitude < 0) {
    throw new Error(
      `Reference record ${pid}: popularity.magnitude must be a non-negative integer, got ${magnitude}.`,
    );
  }
  return magnitude;
}

/** Best-effort id extraction for error messages when schema validation itself fails and `record.id` is unavailable. */
function extractProbableId(json: unknown): number | null {
  if (typeof json !== "object" || json === null || !("id" in json)) {
    return null;
  }
  const candidate = (json as { id: unknown }).id;
  return typeof candidate === "number" ? candidate : null;
}

/**
 * Parses one raw perfumes.jsonl record into normalized, kept-fields-only
 * data. Throws a descriptive `Error` (including the record id when it is
 * known) for: schema validation failures; a non-positive or non-integer
 * `id`; a record with both non-empty tiered and non-empty flat notes; any
 * note weight or accord strength outside 0..100 or non-integer; a longevity
 * or sillage average outside its valid scale (and not 0, which means "no
 * votes"); a negative or non-integer season, daypart, or community vote
 * count; a non-integer `year`; and a negative or non-integer
 * `popularity.magnitude`. An integer `year` outside [1500, current year + 1]
 * does not throw: it is recorded as `null` with an entry in `warnings`
 * instead (see `normalizeYear`).
 */
export function parseReferenceRecord(json: unknown): ParsedReference {
  const result = referenceRecordSchema.safeParse(json);
  if (!result.success) {
    const probableId = extractProbableId(json);
    const idNote = probableId !== null ? ` (id ${probableId})` : "";
    throw new Error(
      `Reference record${idNote} failed schema validation: ${result.error.message}`,
    );
  }
  const record = result.data;

  if (!Number.isInteger(record.id) || record.id <= 0) {
    throw new Error(
      `Reference record id ${record.id} must be a positive integer.`,
    );
  }
  const pid = record.id;

  const notes = parseNotes(record.notes, pid);
  const accords = parseAccords(record.accords, pid);
  const perfumers = parsePerfumers(record.perfumers);
  const { year, warning: yearWarning } = normalizeYear(record.year, pid);
  const warnings: string[] = yearWarning !== null ? [yearWarning] : [];

  return {
    pid,
    recordSlug: record.slug,
    name: record.name.trim(),
    brandName: record.brand.trim(),
    brandSlug: brandSlugFromRecordSlug(record.slug),
    year,
    gender: mapGender(record.gender),
    collection: nullableText(record.collection),
    descriptionEn: nullableText(record.description),
    perfumers,
    accords,
    notes,
    longevity: normalizeAverageMetric(
      record.longevity,
      { min: 1, max: 5 },
      "longevity",
      pid,
    ),
    sillage: normalizeAverageMetric(
      record.sillage,
      { min: 1, max: 4 },
      "sillage",
      pid,
    ),
    seasonVotes: normalizeSeasonVotes(record.seasons, pid),
    daypartVotes: normalizeDaypartVotes(record.daypart, pid),
    communityVotes: normalizeCommunityVotes(record.people, pid),
    popularity: normalizePopularity(record.popularity, pid),
    scrapedAt:
      record.meta.scraped_at !== null
        ? new Date(record.meta.scraped_at * 1000)
        : null,
    warnings,
  };
}
