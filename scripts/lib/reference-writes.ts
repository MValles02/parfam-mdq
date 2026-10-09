/**
 * Database writes of scripts/import-references.ts: the dimension upserts, the
 * per-batch FragranceRef create/update with its relation rows, and the final
 * note usage-count recalculation. The row shapes and every lookup that can
 * fail come from the pure helpers in scripts/lib/reference-import.ts.
 */
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { ParsedReference } from "./reference-parse";
import type { ReferenceTranslations } from "./reference-translations";
import {
  buildAccordDimensionRows,
  buildFragranceRefRow,
  buildNoteDimensionRows,
  buildRelationRows,
  resolveBrandId,
  resolveRefIdByPid,
  type AccordDimensionRow,
  type FragranceRefRow,
  type NoteDimensionRow,
  type ReferenceDimensionAggregator,
  type RelationDimensionIds,
} from "./reference-import";

// Prisma's interactive-transaction default timeout is 5s, sized for a local
// database round trip. Production imports run against a remote database (see
// docs/deployment.md), where the added latency lets a batch of several
// hundred records blow past 5s and fail with "Transaction already closed".
// `timeout` extends the budget per batch; `maxWait` extends how long a batch
// may queue for a connection before starting.
const BATCH_TRANSACTION_OPTIONS = { timeout: 120_000, maxWait: 30_000 };

/**
 * Writes the Brand, Perfumer, Note, and Accord rows the dataset uses. Never
 * deletes a row that exists in the database but not in the dataset: an
 * administrator may have created it by hand and products may already
 * reference it. Requires the translation gate to have passed.
 */
export async function upsertDimensions(
  aggregator: ReferenceDimensionAggregator,
  translations: ReferenceTranslations,
): Promise<void> {
  await upsertBrands(aggregator.brands);
  await upsertPerfumers(aggregator.perfumers);
  await upsertNotes(buildNoteDimensionRows(aggregator, translations));
  await upsertAccords(buildAccordDimensionRows(aggregator, translations));
}

/**
 * Inserts new rows (skipping ones that already exist) and bulk-updates the
 * mutable columns of existing rows in one statement via
 * `jsonb_to_recordset`, so refreshing ~8.3k brands or ~3.1k perfumers costs
 * two round trips total instead of one per row.
 */
async function upsertBrands(rows: { slug: string; name: string }[]) {
  if (rows.length === 0) return;
  await prisma.brand.createMany({ data: rows, skipDuplicates: true });
  await prisma.$executeRaw`
    UPDATE "Brand" b
    SET "name" = t.name
    FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS t(slug text, name text)
    WHERE b.slug = t.slug AND b.name IS DISTINCT FROM t.name
  `;
}

async function upsertPerfumers(rows: { slug: string; name: string }[]) {
  if (rows.length === 0) return;
  await prisma.perfumer.createMany({ data: rows, skipDuplicates: true });
  await prisma.$executeRaw`
    UPDATE "Perfumer" p
    SET "name" = t.name
    FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS t(slug text, name text)
    WHERE p.slug = t.slug AND p.name IS DISTINCT FROM t.name
  `;
}

/** nameEn/nameEs/family always come from the current translation file and dataset aggregation, so a rerun updates them even when the row already existed (unlike usageCount, recomputed separately at the end). */
async function upsertNotes(rows: NoteDimensionRow[]) {
  if (rows.length === 0) return;
  await prisma.note.createMany({
    data: rows.map((r) => ({ ...r, usageCount: 0 })),
    skipDuplicates: true,
  });
  await prisma.$executeRaw`
    UPDATE "Note" n
    SET "nameEn" = t."nameEn", "nameEs" = t."nameEs", "family" = t.family
    FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
      AS t(slug text, "nameEn" text, "nameEs" text, family text)
    WHERE n.slug = t.slug
      AND (n."nameEn" IS DISTINCT FROM t."nameEn"
        OR n."nameEs" IS DISTINCT FROM t."nameEs"
        OR n.family IS DISTINCT FROM t.family)
  `;
}

/** prisma/reference/accords.es.json is the source of truth for nameEn/nameEs/color (see prisma/schema.prisma), so every rerun re-applies the file's current values even to rows that already existed. */
async function upsertAccords(rows: AccordDimensionRow[]) {
  if (rows.length === 0) return;
  await prisma.accord.createMany({ data: rows, skipDuplicates: true });
  await prisma.$executeRaw`
    UPDATE "Accord" a
    SET "nameEn" = t."nameEn", "nameEs" = t."nameEs", "color" = t.color
    FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
      AS t(slug text, "nameEn" text, "nameEs" text, color text)
    WHERE a.slug = t.slug
      AND (a."nameEn" IS DISTINCT FROM t."nameEn"
        OR a."nameEs" IS DISTINCT FROM t."nameEs"
        OR a.color IS DISTINCT FROM t.color)
  `;
}

export interface DimensionIds extends RelationDimensionIds {
  brandIdBySlug: ReadonlyMap<string, string>;
}

/** Every dimension row's id by slug, including rows the dataset does not know about. */
export async function loadDimensionIds(): Promise<DimensionIds> {
  const [brandRows, perfumerRows, noteRows, accordRows] = await Promise.all([
    prisma.brand.findMany({ select: { id: true, slug: true } }),
    prisma.perfumer.findMany({ select: { id: true, slug: true } }),
    prisma.note.findMany({ select: { id: true, slug: true } }),
    prisma.accord.findMany({ select: { id: true, slug: true } }),
  ]);
  return {
    brandIdBySlug: idBySlug(brandRows),
    perfumerIdBySlug: idBySlug(perfumerRows),
    noteIdBySlug: idBySlug(noteRows),
    accordIdBySlug: idBySlug(accordRows),
  };
}

function idBySlug(rows: { id: string; slug: string }[]): Map<string, string> {
  return new Map(rows.map((row) => [row.slug, row.id]));
}

/**
 * Writes one batch of records in a single transaction: creates a
 * FragranceRef for every new pid, updates existing ones in place (their `id`
 * is never reassigned), and replaces the batch's relation rows.
 */
export async function writeReferenceBatch(
  batch: ParsedReference[],
  ids: DimensionIds,
): Promise<{ created: number; updated: number }> {
  return prisma.$transaction(async (tx) => {
    const existingIdByPid = await findExistingRefIds(tx, batch);
    const newRecords = batch.filter((r) => !existingIdByPid.has(r.pid));
    const updateRecords = batch.filter((r) => existingIdByPid.has(r.pid));
    const toRow = (record: ParsedReference): FragranceRefRow =>
      buildFragranceRefRow(record, resolveBrandId(record, ids.brandIdBySlug));

    const createdIdByPid = await createFragranceRefs(tx, newRecords.map(toRow));
    await updateFragranceRefScalars(tx, updateRecords.map(toRow));

    const refIdByPid = resolveRefIdByPid(
      batch,
      existingIdByPid,
      createdIdByPid,
    );
    await replaceRelations(tx, { batch, refIdByPid, ids });

    return { created: newRecords.length, updated: updateRecords.length };
  }, BATCH_TRANSACTION_OPTIONS);
}

async function findExistingRefIds(
  tx: Prisma.TransactionClient,
  batch: ParsedReference[],
): Promise<Map<number, string>> {
  const existing = await tx.fragranceRef.findMany({
    where: { pid: { in: batch.map((r) => r.pid) } },
    select: { id: true, pid: true },
  });
  return new Map(existing.map((e) => [e.pid, e.id]));
}

async function createFragranceRefs(
  tx: Prisma.TransactionClient,
  rows: FragranceRefRow[],
): Promise<Map<number, string>> {
  const created =
    rows.length > 0
      ? await tx.fragranceRef.createManyAndReturn({
          data: rows,
          select: { id: true, pid: true },
        })
      : [];
  return new Map(created.map((c) => [c.pid, c.id]));
}

/**
 * Bulk-updates the scalar columns of FragranceRef rows that already exist
 * (matched by `pid`), in one statement per batch via `jsonb_to_recordset`.
 * `id` is never part of the SET list: existing rows keep their id, which is
 * the whole point of updating in place instead of delete+recreate.
 */
async function updateFragranceRefScalars(
  tx: Prisma.TransactionClient,
  rows: FragranceRefRow[],
) {
  if (rows.length === 0) return;
  await tx.$executeRaw`
    UPDATE "FragranceRef" f
    SET
      "slug" = t.slug,
      "name" = t.name,
      "brandId" = t."brandId",
      "year" = t.year,
      "gender" = t.gender::"Gender",
      "collection" = t.collection,
      "descriptionEn" = t."descriptionEn",
      "longevity" = t.longevity,
      "sillage" = t.sillage,
      "seasonSpringVotes" = t."seasonSpringVotes",
      "seasonSummerVotes" = t."seasonSummerVotes",
      "seasonFallVotes" = t."seasonFallVotes",
      "seasonWinterVotes" = t."seasonWinterVotes",
      "daypartDayVotes" = t."daypartDayVotes",
      "daypartNightVotes" = t."daypartNightVotes",
      "communityVotes" = t."communityVotes",
      "popularity" = t.popularity,
      -- "scrapedAt" is TIMESTAMP(3) (no time zone). t."scrapedAt" arrives as
      -- timestamptz (its ISO string carries a "Z" offset, see
      -- ParsedReference.scrapedAt), and assigning a timestamptz straight into
      -- a timestamp column implicitly converts through the session's
      -- TimeZone GUC — the stored wall-clock value would then depend on
      -- whatever TimeZone the importer's connection happens to have, drifting
      -- from what createManyAndReturn wrote for brand-new rows (the node-
      -- postgres driver Prisma uses there formats a JS Date in UTC
      -- regardless of session TimeZone). AT TIME ZONE 'UTC' renders the
      -- same instant in UTC deterministically, independent of the session,
      -- so reruns of this UPDATE path stay consistent with the create path.
      "scrapedAt" = t."scrapedAt" AT TIME ZONE 'UTC',
      "searchText" = t."searchText",
      "updatedAt" = now()
    FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS t(
      pid integer, slug text, name text, "brandId" text, year integer,
      gender text, collection text, "descriptionEn" text,
      longevity numeric, sillage numeric,
      "seasonSpringVotes" integer, "seasonSummerVotes" integer,
      "seasonFallVotes" integer, "seasonWinterVotes" integer,
      "daypartDayVotes" integer, "daypartNightVotes" integer,
      "communityVotes" integer, popularity integer, "scrapedAt" timestamptz,
      "searchText" text
    )
    WHERE f.pid = t.pid
  `;
}

/**
 * Relations are always fully replaced for the batch's refs, new or existing,
 * so a rerun with revised note/accord weights or a changed perfumer credit
 * never leaves a stale row behind.
 */
async function replaceRelations(
  tx: Prisma.TransactionClient,
  {
    batch,
    refIdByPid,
    ids,
  }: {
    batch: ParsedReference[];
    refIdByPid: ReadonlyMap<number, string>;
    ids: RelationDimensionIds;
  },
): Promise<void> {
  const batchRefIds = [...refIdByPid.values()];
  await tx.fragranceRefNote.deleteMany({
    where: { fragranceRefId: { in: batchRefIds } },
  });
  await tx.fragranceRefAccord.deleteMany({
    where: { fragranceRefId: { in: batchRefIds } },
  });
  await tx.fragranceRefPerfumer.deleteMany({
    where: { fragranceRefId: { in: batchRefIds } },
  });

  const rows = buildRelationRows(batch, refIdByPid, ids);
  if (rows.notes.length > 0) {
    await tx.fragranceRefNote.createMany({ data: rows.notes });
  }
  if (rows.accords.length > 0) {
    await tx.fragranceRefAccord.createMany({ data: rows.accords });
  }
  if (rows.perfumers.length > 0) {
    await tx.fragranceRefPerfumer.createMany({ data: rows.perfumers });
  }
}

/**
 * Recomputes every Note's `usageCount`, which is only knowable after every
 * FragranceRefNote row exists. Returns how many notes changed.
 */
export async function recalculateNoteUsageCounts(): Promise<number> {
  return prisma.$executeRaw`
    UPDATE "Note" n
       SET "usageCount" = COALESCE(u.total, 0)
      FROM (
        SELECT n2."id", count(fn."id") AS total
          FROM "Note" n2
          LEFT JOIN "FragranceRefNote" fn ON fn."noteId" = n2."id"
         GROUP BY n2."id"
      ) u
     WHERE u."id" = n."id"
       AND n."usageCount" IS DISTINCT FROM COALESCE(u.total, 0)
  `;
}
