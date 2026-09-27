import { Prisma } from "@/generated/prisma/client";
import type { Gender } from "@/generated/prisma/enums";
import { escapeLikePattern, formatProperName } from "@/lib/catalog";
import { prisma } from "@/lib/db";

export type ReferenceSearchResult = {
  id: string;
  name: string;
  brandName: string;
  year: number | null;
  gender: Gender | null;
  collection: string | null;
  hasNotes: boolean;
  /** Internal only: used for sorting and context in the admin panel. */
  popularity: number | null;
};

/** A trigram index cannot resolve patterns shorter than three characters. They
 * fall back to a sequential scan of the ~140k-row reference catalog, which is
 * markedly slower for a short term like "le" than for a longer one like
 * "noir". */
const MIN_INDEXABLE_LENGTH = 3;

/** Splits the query into terms that must each occur in the search text. Terms
 * below three characters are omitted from the filter to avoid sequential scans
 * while the meaningful remaining terms still narrow the result. */
function getSearchTerms(query: string) {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length >= MIN_INDEXABLE_LENGTH)
    .slice(0, 6);
}

const RESULT_LIMIT = 12;

/** Candidates reranked by relevance before limiting the response. */
const CANDIDATE_LIMIT = 60;

/** Popularity alone cannot rank exact matches reliably. `pg_trgm` similarity
 * supplies the relevance signal. The score weights similarity and popularity
 * 75/25. */
const SIMILARITY_WEIGHT = 0.75;
const POPULARITY_WEIGHT = 0.25;

/**
 * `FragranceRef.popularity` is the dataset's raw `popularity.magnitude` and
 * is effectively unbounded, so it is compressed with `ln(1 + popularity)`
 * before mixing it with similarity (which is already 0..1). This ceiling is
 * the popularity value that maps to a compressed score of 1. The imported
 * catalog's observed maximum is about 144,000, so this ceiling sits well
 * above it and no candidate saturates the scale.
 */
const POPULARITY_CEILING = 200_000;
const POPULARITY_CEILING_LN = Math.log(1 + POPULARITY_CEILING);

/**
 * Fuzzy search across the ~140k-row reference catalog.
 *
 * It uses the persisted `parfam_normalize` function (unaccent + lower) with
 * the GIN trigram index on the denormalized `searchText` column. Candidates
 * are first narrowed by popularity so `similarity()` only runs against a
 * manageable set, then reranked by a similarity/popularity blend.
 */
export async function searchReferences(
  query: string,
): Promise<ReferenceSearchResult[]> {
  const terms = getSearchTerms(query);
  if (terms.length === 0) return [];
  // Similarity receives the entire query because short terms still matter to
  // the final score after filtering.
  const fullQuery = query.trim().toLowerCase();

  // Build one AND condition per term with bound parameters rather than SQL
  // interpolation.
  const conditions = Prisma.join(
    terms.map(
      (term) =>
        Prisma.sql`parfam_normalize(f."searchText") LIKE ${escapeLikePattern(term)} ESCAPE '\\'`,
    ),
    " AND ",
  );

  const rows = await prisma.$queryRaw<
    {
      id: string;
      name: string;
      brandName: string;
      year: number | null;
      gender: Gender | null;
      collection: string | null;
      popularity: number | null;
      hasNotes: boolean;
    }[]
  >`
    WITH candidates AS (
      SELECT f."id",
             f."name",
             f."year",
             f."gender",
             f."collection",
             f."popularity",
             f."brandId",
             parfam_normalize(f."searchText") AS "normalizedSearchText"
        FROM "FragranceRef" f
       WHERE ${conditions}
       -- Limit candidates before similarity() runs against a broad query.
       ORDER BY f."popularity" DESC NULLS LAST
       LIMIT ${CANDIDATE_LIMIT}
    )
    SELECT c."id",
           c."name",
           b."name" AS "brandName",
           c."year",
           c."gender",
           c."collection",
           c."popularity",
           EXISTS (
             SELECT 1 FROM "FragranceRefNote" n
              WHERE n."fragranceRefId" = c."id"
           ) AS "hasNotes"
      FROM candidates c
      JOIN "Brand" b ON b."id" = c."brandId"
     ORDER BY similarity(c."normalizedSearchText", ${fullQuery}) * ${SIMILARITY_WEIGHT}
              + LEAST(1, ln((1 + COALESCE(c."popularity", 0))::numeric) / ${POPULARITY_CEILING_LN}::numeric) * ${POPULARITY_WEIGHT} DESC,
              c."popularity" DESC NULLS LAST,
              c."name" ASC
     LIMIT ${RESULT_LIMIT}
  `;

  return rows;
}

/**
 * Converts a group of vote counts (e.g. the four season tallies) into
 * rounded integer percentages that sum to 100, using the largest-remainder
 * method so rounding each entry independently cannot drift the total away
 * from 100. Returns an array of nulls when the whole group is unset: either
 * every count is null, or they are all zero.
 */
export function toPercentages(votes: (number | null)[]): (number | null)[] {
  const total = votes.reduce((sum: number, v) => sum + (v ?? 0), 0);
  if (total === 0) return votes.map(() => null);

  const shares = votes.map((v) => ((v ?? 0) / total) * 100);
  const floors = shares.map(Math.floor);
  const remainder = 100 - floors.reduce((sum, v) => sum + v, 0);

  // Distribute the leftover percentage points to the entries whose
  // fractional part was closest to rounding up.
  const byFraction = shares
    .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
    .sort((a, b) => b.fraction - a.fraction);

  const result = [...floors];
  for (let i = 0; i < remainder; i++) {
    result[byFraction[i].index] += 1;
  }
  return result;
}

/**
 * Gets the reference fields used to prepopulate the adoption form. Notes and
 * accords use the required Spanish translation, and accords include chip
 * colors.
 */
export async function getReferenceForAdoption(id: string) {
  const reference = await prisma.fragranceRef.findUnique({
    where: { id },
    select: {
      id: true,
      pid: true,
      slug: true,
      name: true,
      year: true,
      gender: true,
      collection: true,
      longevity: true,
      sillage: true,
      seasonSpringVotes: true,
      seasonSummerVotes: true,
      seasonFallVotes: true,
      seasonWinterVotes: true,
      daypartDayVotes: true,
      daypartNightVotes: true,
      communityVotes: true,
      descriptionEn: true,
      brand: { select: { id: true, name: true } },
      notes: {
        // Postgres sorts a native enum by declaration order (TOP, MIDDLE,
        // BASE) and, ascending, puts NULLs last by default, so this single
        // `asc` clause yields TOP, MIDDLE, BASE, then the flat (null) notes.
        orderBy: [
          { position: "asc" },
          { weight: "desc" },
          { sortOrder: "asc" },
        ],
        select: {
          position: true,
          weight: true,
          note: { select: { id: true, nameEs: true } },
        },
      },
      accords: {
        orderBy: { strength: "desc" },
        select: {
          strength: true,
          accord: { select: { id: true, nameEs: true, color: true } },
        },
      },
      perfumers: {
        select: { perfumer: { select: { id: true, name: true } } },
      },
    },
  });
  if (!reference) return null;

  const [seasonSpring, seasonSummer, seasonFall, seasonWinter] = toPercentages([
    reference.seasonSpringVotes,
    reference.seasonSummerVotes,
    reference.seasonFallVotes,
    reference.seasonWinterVotes,
  ]);
  const [daypartDay, daypartNight] = toPercentages([
    reference.daypartDayVotes,
    reference.daypartNightVotes,
  ]);

  return {
    id: reference.id,
    name: reference.name,
    year: reference.year,
    gender: reference.gender,
    collection: reference.collection,
    longevity:
      reference.longevity === null ? null : Number(reference.longevity),
    sillage: reference.sillage === null ? null : Number(reference.sillage),
    seasonSpring,
    seasonSummer,
    seasonFall,
    seasonWinter,
    daypartDay,
    daypartNight,
    communityVotes: reference.communityVotes,
    // This internal Fragrantica copy helps administrators write descriptions
    // and is never published.
    descriptionEn: reference.descriptionEn,
    // Panel-only deep link back to the source Fragrantica page; never shown
    // to customers.
    referenceUrl: `https://www.fragrantica.com/perfume/${reference.slug}-${reference.pid}.html`,
    brand: reference.brand,
    notes: reference.notes.map((note) => ({
      noteId: note.note.id,
      name: note.note.nameEs,
      position: note.position,
      weight: note.weight,
    })),
    accords: reference.accords.map((accord) => ({
      accordId: accord.accord.id,
      name: accord.accord.nameEs,
      color: accord.accord.color,
      strength: accord.strength,
    })),
    perfumers: reference.perfumers.map((perfumer) => ({
      perfumerId: perfumer.perfumer.id,
      // Imported `Perfumer.name` casing is inconsistent (F-21 in
      // docs/findings.md), so normalize it for display.
      name: formatProperName(perfumer.perfumer.name),
    })),
  };
}

export type AdoptableReference = NonNullable<
  Awaited<ReturnType<typeof getReferenceForAdoption>>
>;
