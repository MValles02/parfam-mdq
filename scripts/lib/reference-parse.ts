/**
 * Pure parser for new-database/perfumes.jsonl records — the Fragrantica
 * reference-catalog dump (see new-database/SCHEMA.md, gitignored and
 * local-only, for the full record shape). This module does no database,
 * file, or network I/O: it takes already-parsed JSON in and returns typed,
 * normalized data out, so the importer and the translation-coverage check
 * both reuse it without a live database.
 *
 * `parseReferenceRecord` validates the raw record against
 * scripts/lib/reference-record-schema.ts (which also lists the dropped
 * fields), parses its note, accord, and perfumer lists with
 * scripts/lib/reference-parse-lists.ts, and normalizes the remaining scalar
 * fields here.
 */

import { toSlug } from "../../src/lib/slug";
import {
  parseAccords,
  parseNotes,
  parsePerfumers,
  toNoteSlug,
  type NotePosition,
  type ParsedAccord,
  type ParsedNote,
  type ParsedPerfumer,
} from "./reference-parse-lists";
import { referenceRecordSchema } from "./reference-record-schema";

export { toNoteSlug, toSlug };
export type { NotePosition };

/**
 * Mirrors the Prisma `Gender` enum (prisma/schema.prisma) as a local string
 * union instead of importing it. Importing the generated Prisma client
 * (directly, or transitively through another module) would tie this file to
 * `prisma generate` having run, which a pure parser and the importer scripts
 * should not depend on.
 */
export type Gender = "WOMEN" | "MEN" | "UNISEX";

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
   * scripts/lib/reference-import.test.ts) do not have to name it. Readers
   * still guard with `?? []` (see `countYearOutOfRangeWarnings`) to keep that
   * distinction honest at the type level.
   */
  warnings?: string[];
}

/**
 * How many of the record's warnings report an out-of-range year (0 or 1).
 * Currently the only warning `parseReferenceRecord` ever produces is a year
 * outside the plausible range (see `normalizeYear`), so counting warning
 * entries doubles as counting those records; this comment is the tripwire to
 * revisit the count if a second kind of warning is ever added.
 */
export function countYearOutOfRangeWarnings(record: ParsedReference): number {
  return (record.warnings ?? []).length;
}

/** Trims a nullable text field; an empty result becomes `null` rather than a persisted empty string. */
function nullableText(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
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
const NO_VOTES_AVERAGE = 0;
const LONGEVITY_RANGE = { min: 1, max: 5 } as const;
const SILLAGE_RANGE = { min: 1, max: 4 } as const;

function normalizeAverageMetric(
  metric: { average: number | null } | null,
  range: { min: number; max: number },
  label: "longevity" | "sillage",
  pid: number,
): number | null {
  if (metric === null || metric.average === null) return null;
  const { average } = metric;
  if (average === NO_VOTES_AVERAGE) return null;
  if (average < range.min || average > range.max) {
    throw new Error(
      `Reference record ${pid}: ${label} average ${average} is outside the valid range [${range.min}, ${range.max}].`,
    );
  }
  return average;
}

/**
 * Season/daypart tallies come from the same encrypted vote blob as
 * longevity/sillage (see `referenceRecordSchema` in
 * scripts/lib/reference-record-schema.ts). When the community simply hasn't
 * voted on seasonality (or day/night), every bucket reads 0 rather than the
 * blob being absent — so an all-zero tally means "no votes", not "0% of
 * voters chose every option", and must become `null` before it reaches the
 * store.
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
const MIN_PLAUSIBLE_YEAR = 1500;
const MAX_YEARS_AHEAD_OF_RELEASE = 1;

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
  const minYear = MIN_PLAUSIBLE_YEAR;
  const maxYear = new Date().getFullYear() + MAX_YEARS_AHEAD_OF_RELEASE;
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

/** `meta.scraped_at` is a Unix timestamp in seconds; `Date` takes milliseconds. */
const MS_PER_SECOND = 1000;

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
      LONGEVITY_RANGE,
      "longevity",
      pid,
    ),
    sillage: normalizeAverageMetric(
      record.sillage,
      SILLAGE_RANGE,
      "sillage",
      pid,
    ),
    seasonVotes: normalizeSeasonVotes(record.seasons, pid),
    daypartVotes: normalizeDaypartVotes(record.daypart, pid),
    communityVotes: normalizeCommunityVotes(record.people, pid),
    popularity: normalizePopularity(record.popularity, pid),
    scrapedAt:
      record.meta.scraped_at !== null
        ? new Date(record.meta.scraped_at * MS_PER_SECOND)
        : null,
    warnings,
  };
}
