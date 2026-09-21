import { Prisma } from "@/generated/prisma/client";
import type { Gender } from "@/generated/prisma/enums";
import { formatProperName } from "@/lib/catalog";
import { prisma } from "@/lib/db";

export type ReferenceSearchResult = {
  id: string;
  name: string;
  brandName: string;
  year: number | null;
  gender: Gender | null;
  hasPyramid: boolean;
  /** Internal only: used for sorting and context in the admin panel. */
  ratingValue: number | null;
  ratingCount: number | null;
};

/** Escapes LIKE wildcards so administrator input cannot broaden matching. The
 * backslash is escaped first to prevent escaping it a second time. */
function escapeLikePattern(term: string) {
  const escaped = term
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  return `%${escaped}%`;
}

/** A trigram index cannot resolve patterns shorter than three characters. They
 * fall back to a sequential scan of 70k rows: 244 ms for "le" versus 9 ms
 * for "noir". */
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

/** Raw ratings overvalue small samples, so results use the IMDb Top 250 style
 * Bayesian average: `(v * R + m * C) / (v + m)`. The 150 prior votes fall
 * between the 75th and 90th rating-count percentiles of the imported data. */
const PRIOR_VOTES = 150;
const AVERAGE_RATING = 3.977;

/** Popularity alone cannot rank exact matches reliably. `pg_trgm` similarity
 * supplies the relevance signal. The score weights similarity and popularity
 * 75/25 after normalizing the Bayesian rating from [3, 5] to [0, 1]. */
const SIMILARITY_WEIGHT = 0.75;
const POPULARITY_WEIGHT = 0.25;

/**
 * Fuzzy search across approximately 70k reference fragrances.
 *
 * It uses the persisted `parfam_normalize` function (unaccent + lower) with
 * the GIN trigram index on the denormalized `searchText` column. Bayesian
 * ranking is the best available proxy for the administrator's intended entry.
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
      hasPyramid: boolean;
      ratingValue: Prisma.Decimal | null;
      ratingCount: number | null;
    }[]
  >`
    WITH bayes AS (
      SELECT f."id",
             f."name",
             f."year",
             f."gender",
             f."hasPyramid",
             f."ratingValue",
             f."ratingCount",
             f."brandId",
             parfam_normalize(f."searchText") AS "normalizedSearchText",
             (COALESCE(f."ratingCount", 0) * COALESCE(f."ratingValue", ${AVERAGE_RATING}::numeric)
              + ${PRIOR_VOTES}::numeric * ${AVERAGE_RATING}::numeric)
             / (COALESCE(f."ratingCount", 0) + ${PRIOR_VOTES}::numeric) AS "popularityScore"
        FROM "FragranceRef" f
       WHERE ${conditions}
       -- Limit candidates before similarity() runs against a broad query.
       ORDER BY "popularityScore" DESC
       LIMIT ${CANDIDATE_LIMIT}
    )
    SELECT c."id",
           c."name",
           b."name" AS "brandName",
           c."year",
           c."gender",
           c."hasPyramid",
           c."ratingValue",
           c."ratingCount"
      FROM bayes c
      JOIN "Brand" b ON b."id" = c."brandId"
     ORDER BY similarity(c."normalizedSearchText", ${fullQuery}) * ${SIMILARITY_WEIGHT}
              + (c."popularityScore" - 3) / 2 * ${POPULARITY_WEIGHT} DESC,
              c."ratingCount" DESC NULLS LAST,
              c."name" ASC
     LIMIT ${RESULT_LIMIT}
  `;

  return rows.map((row) => ({
    ...row,
    ratingValue: row.ratingValue === null ? null : Number(row.ratingValue),
  }));
}

/**
 * Gets the reference fields used to prepopulate the adoption form. Notes use
 * Spanish translations with English fallbacks, and accords include chip colors.
 */
export async function getReferenceForAdoption(id: string) {
  const reference = await prisma.fragranceRef.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      year: true,
      gender: true,
      url: true,
      descriptionEn: true,
      brand: { select: { id: true, name: true } },
      notes: {
        orderBy: { sortOrder: "asc" },
        select: {
          position: true,
          sortOrder: true,
          note: { select: { id: true, nameEn: true, nameEs: true } },
        },
      },
      accords: {
        orderBy: { rank: "asc" },
        select: {
          rank: true,
          accord: {
            select: { id: true, nameEn: true, nameEs: true, color: true },
          },
        },
      },
      perfumers: {
        select: { perfumer: { select: { id: true, name: true } } },
      },
    },
  });
  if (!reference) return null;

  return {
    id: reference.id,
    name: reference.name,
    year: reference.year,
    gender: reference.gender,
    url: reference.url,
    // This internal Fragrantica copy helps administrators write descriptions
    // and is never published.
    descriptionEn: reference.descriptionEn,
    brand: reference.brand,
    notes: reference.notes.map((note) => ({
      noteId: note.note.id,
      name: note.note.nameEs ?? note.note.nameEn,
      isTranslated: note.note.nameEs !== null,
      position: note.position,
      sortOrder: note.sortOrder,
    })),
    accords: reference.accords.map((accord) => ({
      accordId: accord.accord.id,
      name: accord.accord.nameEs,
      color: accord.accord.color,
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
