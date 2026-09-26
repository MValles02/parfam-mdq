/**
 * Pure "Se parece a" scoring. Nothing here imports Prisma: `src/lib/store/queries.ts`
 * loads the raw rows and hands plain data in, so this module stays trivial to
 * unit test and reusable if the ranking ever needs to run outside a query.
 *
 * The score combines three cosine-similarity components plus a small additive
 * bonus:
 *
 * - 0.50 accord-strength vectors (`ProductAccord.strength`).
 * - 0.30 note-family vectors, `Note.family` grouping with the strongest
 *   `ProductNote.weight` per family (see the presence rule below).
 * - 0.15 the 6-dim season/daypart profile.
 * - +0.05 flat bonus for a shared, non-null, case-insensitive `collection` or
 *   at least one shared perfumer.
 *
 * A component is "missing" only when a whole side has none of that data (no
 * `ProductAccord` rows, no `ProductNote` rows, or every season/daypart value
 * null on at least one side for every shared dimension). A missing component
 * is dropped and the remaining component weights are renormalized to sum to
 * 1, so a product with, say, no notes is ranked purely on accords and
 * profile. This differs from two products simply sharing no accord in
 * common: that is a real (typically low) cosine value, not a missing
 * component, because both sides do have accord data to compare.
 *
 * The bonus is applied after renormalization and is not itself renormalized:
 * it can push an otherwise low or even zero base score up by at most 0.05.
 * The total is clamped to 1 so a perfect weighted match plus the bonus never
 * exceeds the documented [0, 1] range.
 */

export type SimilarityGender = "MEN" | "WOMEN" | "UNISEX" | null;

export type SimilarityAccord = {
  accordId: string;
  /** 0..100, `ProductAccord.strength`. */
  strength: number;
};

export type SimilarityNote = {
  /** `Note.family`, not the note itself: the score compares families. */
  family: string;
  /** 0..100, `ProductNote.weight`. */
  weight: number;
};

export type SimilarityProfile = {
  seasonSpring: number | null;
  seasonSummer: number | null;
  seasonFall: number | null;
  seasonWinter: number | null;
  daypartDay: number | null;
  daypartNight: number | null;
};

export type SimilarityCandidate = {
  id: string;
  gender: SimilarityGender;
  accords: SimilarityAccord[];
  notes: SimilarityNote[];
  profile: SimilarityProfile;
  /** Trimmed as stored; comparison normalizes case and whitespace. */
  collection: string | null;
  perfumerIds: string[];
  isFeatured: boolean;
  /** Epoch milliseconds, so callers convert `Date` once when loading rows. */
  createdAt: number;
};

/** Top N precomputed per product, matching the "Se parece a" UI's cap. */
export const SIMILAR_PRODUCTS_LIMIT = 20;

const ACCORD_WEIGHT = 0.5;
const NOTE_WEIGHT = 0.3;
const PROFILE_WEIGHT = 0.15;
const SAME_COLLECTION_OR_PERFUMER_BONUS = 0.05;

const PROFILE_DIMENSIONS: (keyof SimilarityProfile)[] = [
  "seasonSpring",
  "seasonSummer",
  "seasonFall",
  "seasonWinter",
  "daypartDay",
  "daypartNight",
];

/**
 * MEN and WOMEN never match each other. UNISEX and a null gender (a manually
 * created product without one set) are compatible with everything, including
 * each other.
 */
export function isGenderCompatible(
  a: SimilarityGender,
  b: SimilarityGender,
): boolean {
  if (a === "MEN" && b === "WOMEN") return false;
  if (a === "WOMEN" && b === "MEN") return false;
  return true;
}

/**
 * Cosine similarity over the union of keys present in either sparse vector,
 * treating an absent key as 0. Returns 0 (rather than `NaN` from a 0/0
 * division) when either vector has zero magnitude, which can only happen
 * here if every value present is 0.
 */
function cosineSparse(
  a: Record<string, number>,
  b: Record<string, number>,
): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const key of keys) {
    const valueA = a[key] ?? 0;
    const valueB = b[key] ?? 0;
    dot += valueA * valueB;
    normA += valueA * valueA;
    normB += valueB * valueB;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** `null` means the accord component is missing for this product: no
 * `ProductAccord` rows at all, as opposed to rows that merely share nothing
 * with the other side. */
function buildAccordVector(
  accords: SimilarityAccord[],
): Record<string, number> | null {
  if (accords.length === 0) return null;
  const vector: Record<string, number> = {};
  for (const accord of accords) {
    vector[accord.accordId] = accord.strength;
  }
  return vector;
}

/**
 * Groups by family and keeps the strongest weight per family. Community data
 * that has not been voted on yet leaves every `ProductNote.weight` at 0
 * (see `prisma/schema.prisma`); a zero vector has no direction, so cosine
 * similarity would always return 0 for it. The spec calls for presence
 * instead in that case: every family the product has gets weight 1, so two
 * products that share the same note families still score as similar even
 * before anyone has voted on relative strength.
 */
function buildNoteFamilyVector(
  notes: SimilarityNote[],
): Record<string, number> | null {
  if (notes.length === 0) return null;
  const allWeightsAreZero = notes.every((note) => note.weight === 0);
  const vector: Record<string, number> = {};
  for (const note of notes) {
    const value = allWeightsAreZero ? 1 : note.weight;
    vector[note.family] = Math.max(vector[note.family] ?? 0, value);
  }
  return vector;
}

/**
 * Cosine similarity over only the season/daypart dimensions both products
 * have a value for. `null` means neither side had a single shared dimension
 * to compare (for example, one side has no profile at all), which the caller
 * treats as a missing component rather than a 0 score.
 */
function profileSimilarity(
  a: SimilarityProfile,
  b: SimilarityProfile,
): number | null {
  const sharedPairs: [number, number][] = [];
  for (const dimension of PROFILE_DIMENSIONS) {
    const valueA = a[dimension];
    const valueB = b[dimension];
    if (valueA !== null && valueB !== null) {
      sharedPairs.push([valueA, valueB]);
    }
  }
  if (sharedPairs.length === 0) return null;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [valueA, valueB] of sharedPairs) {
    dot += valueA * valueB;
    normA += valueA * valueA;
    normB += valueB * valueB;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function normalizeCollection(collection: string | null): string | null {
  const trimmed = collection?.trim().toLocaleLowerCase("es-AR") ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

/** +0.05 when both products share a non-null, case-insensitive `collection`
 * or at least one perfumer. */
function hasBonus(a: SimilarityCandidate, b: SimilarityCandidate): boolean {
  const collectionA = normalizeCollection(a.collection);
  const collectionB = normalizeCollection(b.collection);
  if (collectionA !== null && collectionA === collectionB) return true;
  return a.perfumerIds.some((perfumerId) => b.perfumerIds.includes(perfumerId));
}

/**
 * Combines whichever components are present, weighted and renormalized to
 * sum to 1, then adds the flat bonus on top and clamps to [0, 1].
 */
export function scoreSimilarity(
  a: SimilarityCandidate,
  b: SimilarityCandidate,
): number {
  if (a.id === b.id) return 0;
  if (!isGenderCompatible(a.gender, b.gender)) return 0;

  const accordVectorA = buildAccordVector(a.accords);
  const accordVectorB = buildAccordVector(b.accords);
  const noteVectorA = buildNoteFamilyVector(a.notes);
  const noteVectorB = buildNoteFamilyVector(b.notes);
  const profileScore = profileSimilarity(a.profile, b.profile);

  const components: { score: number; weight: number }[] = [];
  if (accordVectorA !== null && accordVectorB !== null) {
    components.push({
      score: cosineSparse(accordVectorA, accordVectorB),
      weight: ACCORD_WEIGHT,
    });
  }
  if (noteVectorA !== null && noteVectorB !== null) {
    components.push({
      score: cosineSparse(noteVectorA, noteVectorB),
      weight: NOTE_WEIGHT,
    });
  }
  if (profileScore !== null) {
    components.push({ score: profileScore, weight: PROFILE_WEIGHT });
  }

  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const baseScore =
    totalWeight === 0
      ? 0
      : components.reduce((sum, c) => sum + c.score * c.weight, 0) /
        totalWeight;

  const bonus = hasBonus(a, b) ? SAME_COLLECTION_OR_PERFUMER_BONUS : 0;
  return Math.min(1, baseScore + bonus);
}

/**
 * Ranks every candidate against every other candidate and keeps the top
 * `SIMILAR_PRODUCTS_LIMIT` per product. Pairs that score 0 (gender-excluded,
 * or simply unrelated) are left out: a "Se parece a" section listing
 * completely unrelated products, kept only to pad the list to 20, would be
 * misleading rather than useful. Ties break by `isFeatured` (featured first),
 * then by `createdAt` (newest first), matching the catalog's own default
 * sort in `listCatalog` (`src/lib/store/queries.ts`).
 */
export function rankSimilarProducts(
  candidates: SimilarityCandidate[],
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const candidate of candidates) {
    const ranked = candidates
      .filter((other) => other.id !== candidate.id)
      .map((other) => ({ other, score: scoreSimilarity(candidate, other) }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        if (left.other.isFeatured !== right.other.isFeatured) {
          return left.other.isFeatured ? -1 : 1;
        }
        return right.other.createdAt - left.other.createdAt;
      })
      .slice(0, SIMILAR_PRODUCTS_LIMIT)
      .map(({ other }) => other.id);

    result[candidate.id] = ranked;
  }

  return result;
}
