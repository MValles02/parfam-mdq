/**
 * Imports the reference catalog from new-database/perfumes.jsonl (gitignored
 * and local-only; see new-database/SCHEMA.md for the record shape) into
 * Postgres. Run from a developer machine against the local database, or in
 * production against the Dokploy Postgres instance through an SSH tunnel
 * (point DATABASE_URL at the tunnel; see docs/deployment.md).
 *
 *   pnpm db:import-references                        # full dataset (140k+ records)
 *   pnpm db:import-references --limit 1000            # quick check
 *   pnpm db:import-references --batch-size 200
 *   pnpm db:import-references --translations-dir /tmp/reference-scratch
 *
 * Unlike some package managers, pnpm forwards flags to the underlying script
 * directly, so no literal `--` separator is needed before them.
 *
 * Idempotent and keeps FragranceRef.id stable across reruns: an existing row
 * (matched by its unique `pid`) is updated in place rather than deleted and
 * recreated. This matters because Product.fragranceRefId uses `onDelete:
 * SetNull` (see prisma/schema.prisma) — deleting and recreating rows would
 * silently unlink any product an administrator already adopted from that
 * reference. Brand, Perfumer, Note, and Accord dimension rows are likewise
 * never deleted, since the store may hold admin-created rows the dataset
 * does not know about.
 *
 * The store only ever shows customer copy in Spanish (see AGENTS.md), so
 * every note and accord slug this dataset uses must already have a Spanish
 * translation committed under prisma/reference/ (see
 * scripts/lib/reference-translations.ts). Pass 1 below refuses to write
 * anything to the database while any slug is untranslated.
 */
import "dotenv/config";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import { parseArgs } from "node:util";
import { prisma } from "@/lib/db";
import {
  parseReferenceRecord,
  type ParsedReference,
} from "./lib/reference-parse";
import {
  findMissingTranslations,
  loadReferenceTranslations,
  type ReferenceTranslations,
} from "./lib/reference-translations";
import {
  ReferenceDimensionAggregator,
  buildFragranceRefRow,
  type FragranceRefRow,
} from "./lib/reference-import";

const { values } = parseArgs({
  strict: true,
  options: {
    file: { type: "string", default: "new-database/perfumes.jsonl" },
    limit: { type: "string" },
    "batch-size": { type: "string", default: "500" },
    "translations-dir": { type: "string", default: "prisma/reference" },
  },
});

const filePath = path.resolve(process.cwd(), values.file!);
const limit = values.limit ? Number.parseInt(values.limit, 10) : undefined;
const batchSize = Number.parseInt(values["batch-size"]!, 10);
const translationsDir = values["translations-dir"]!;

function fmt(n: number): string {
  return n.toLocaleString("es-AR");
}

function elapsedSeconds(startedAt: number): string {
  return ((Date.now() - startedAt) / 1000).toFixed(1);
}

/**
 * Streams `filePath` line by line, yielding parsed records up to `--limit`.
 * Both passes call this so they read the exact same bounded prefix of the
 * file without ever holding the full 140k+ record dataset in memory.
 */
async function* streamRecords(): AsyncGenerator<ParsedReference> {
  const rl = createInterface({
    input: createReadStream(filePath, "utf-8"),
    crlfDelay: Infinity,
  });
  let count = 0;
  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber += 1;
    if (line.trim() === "") continue;
    if (limit !== undefined && count >= limit) {
      rl.close();
      break;
    }
    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch (error) {
      throw new Error(
        `${filePath}:${lineNumber}: line is not valid JSON (${(error as Error).message}).`,
      );
    }
    yield parseReferenceRecord(json);
    count += 1;
  }
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

interface NoteDimensionRow {
  slug: string;
  nameEn: string;
  nameEs: string;
  family: string;
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

interface AccordDimensionRow {
  slug: string;
  nameEn: string;
  nameEs: string;
  color: string;
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

/**
 * Bulk-updates the scalar columns of FragranceRef rows that already exist
 * (matched by `pid`), in one statement per batch via `jsonb_to_recordset`.
 * `id` is never part of the SET list: existing rows keep their id, which is
 * the whole point of updating in place instead of delete+recreate.
 */
async function updateFragranceRefScalars(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
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

interface ImportSummary {
  records: number;
  refsCreated: number;
  refsUpdated: number;
  brands: number;
  perfumers: number;
  notes: number;
  accords: number;
  yearOutOfRangeCount: number;
}

async function main() {
  const startedAt = Date.now();

  // ---------------------------------------------------------------------
  // Pass 1: aggregate dimensions and gate on missing translations before
  // writing anything.
  // ---------------------------------------------------------------------
  console.log(`Pass 1/2: reading ${filePath} ...`);
  const aggregator = new ReferenceDimensionAggregator();
  let recordCount = 0;
  // Currently the only warning `parseReferenceRecord` ever produces is a
  // year outside the plausible range (see normalizeYear in
  // scripts/lib/reference-parse.ts), so counting warning entries doubles as
  // counting those records; this comment is the tripwire to revisit the
  // count if a second kind of warning is ever added.
  let yearOutOfRangeCount = 0;
  for await (const record of streamRecords()) {
    aggregator.add(record);
    recordCount += 1;
    yearOutOfRangeCount += (record.warnings ?? []).length;
  }
  console.log(`  ${fmt(recordCount)} records parsed`);
  console.log(
    `  detected dimensions: ${fmt(aggregator.brands.length)} brands, ${fmt(aggregator.perfumers.length)} perfumers, ${fmt(aggregator.noteSlugs.length)} notes, ${fmt(aggregator.accordSlugs.length)} accords`,
  );

  let translations: ReferenceTranslations;
  try {
    translations = loadReferenceTranslations(translationsDir);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }

  const missing = findMissingTranslations(
    { noteSlugs: aggregator.noteSlugs, accordSlugs: aggregator.accordSlugs },
    translations,
  );
  const missingTotal =
    missing.missingNotes.length + missing.missingAccords.length;
  if (missingTotal > 0) {
    console.error(
      `\n${fmt(missingTotal)} slug(s) used by the dataset have no Spanish translation in ${translationsDir}. Refusing to write to the database.`,
    );
    if (missing.missingNotes.length > 0) {
      console.error(`  missing notes: ${missing.missingNotes.join(", ")}`);
    }
    if (missing.missingAccords.length > 0) {
      console.error(`  missing accords: ${missing.missingAccords.join(", ")}`);
    }
    process.exit(1);
  }
  console.log("Every note and accord used by the dataset is translated.");

  // ---------------------------------------------------------------------
  // Dimensions: Brand, Perfumer, Note, Accord. Never delete a row that
  // exists in the database but not in the dataset — an administrator may
  // have created it by hand and products may already reference it.
  // ---------------------------------------------------------------------
  console.log("Writing dimensions...");
  await upsertBrands(aggregator.brands);
  await upsertPerfumers(aggregator.perfumers);

  const noteRows: NoteDimensionRow[] = aggregator.noteSlugs.map((slug) => {
    // Guaranteed present: the translation gate above already verified every
    // note slug the dataset uses has an entry in translations.notes.
    const translation = translations.notes.get(slug)!;
    return {
      slug,
      nameEn: translation.en,
      nameEs: translation.es,
      family: aggregator.familyFor(slug),
    };
  });
  await upsertNotes(noteRows);

  const accordRows: AccordDimensionRow[] = aggregator.accordSlugs.map(
    (slug) => {
      const translation = translations.accords.get(slug)!;
      return {
        slug,
        nameEn: translation.en,
        nameEs: translation.es,
        color: translation.color,
      };
    },
  );
  await upsertAccords(accordRows);

  const [brandRows, perfumerRows, allNoteRows, allAccordRows] =
    await Promise.all([
      prisma.brand.findMany({ select: { id: true, slug: true } }),
      prisma.perfumer.findMany({ select: { id: true, slug: true } }),
      prisma.note.findMany({ select: { id: true, slug: true } }),
      prisma.accord.findMany({ select: { id: true, slug: true } }),
    ]);
  const brandIdBySlug = new Map(brandRows.map((b) => [b.slug, b.id]));
  const perfumerIdBySlug = new Map(perfumerRows.map((p) => [p.slug, p.id]));
  const noteIdBySlug = new Map(allNoteRows.map((n) => [n.slug, n.id]));
  const accordIdBySlug = new Map(allAccordRows.map((a) => [a.slug, a.id]));
  console.log(
    `  dimensions ready: ${fmt(brandIdBySlug.size)} brands, ${fmt(perfumerIdBySlug.size)} perfumers, ${fmt(noteIdBySlug.size)} notes, ${fmt(accordIdBySlug.size)} accords`,
  );

  // ---------------------------------------------------------------------
  // Pass 2: FragranceRef rows and their note/accord/perfumer relations,
  // batched. `id` is never reassigned for a pid that already exists.
  // ---------------------------------------------------------------------
  console.log(`Pass 2/2: writing ${fmt(recordCount)} reference records...`);
  let refsCreated = 0;
  let refsUpdated = 0;
  let processed = 0;
  const passStartedAt = Date.now();

  let batchRecords: ParsedReference[] = [];
  const flushBatch = async () => {
    if (batchRecords.length === 0) return;
    const batch = batchRecords;
    batchRecords = [];
    const pids = batch.map((r) => r.pid);

    // Prisma's interactive-transaction default timeout is 5s, sized for a
    // local database round trip. In production this script runs from a
    // developer machine against Dokploy Postgres through an SSH tunnel (see
    // the module comment above), where the added latency lets a batch of
    // several hundred records blow past 5s and fail with "Transaction
    // already closed". `timeout` extends the budget per batch; `maxWait`
    // extends how long a batch may queue for a connection before starting.
    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.fragranceRef.findMany({
          where: { pid: { in: pids } },
          select: { id: true, pid: true },
        });
        const existingIdByPid = new Map(existing.map((e) => [e.pid, e.id]));

        const newRecords = batch.filter((r) => !existingIdByPid.has(r.pid));
        const updateRecords = batch.filter((r) => existingIdByPid.has(r.pid));

        const newRows: FragranceRefRow[] = newRecords.map((r) => {
          const brandId = brandIdBySlug.get(r.brandSlug);
          if (!brandId) {
            throw new Error(
              `Unresolved brand "${r.brandName}" (pid ${r.pid}).`,
            );
          }
          return buildFragranceRefRow(r, brandId);
        });
        const created =
          newRows.length > 0
            ? await tx.fragranceRef.createManyAndReturn({
                data: newRows,
                select: { id: true, pid: true },
              })
            : [];
        const createdIdByPid = new Map(created.map((c) => [c.pid, c.id]));

        const updateRows: FragranceRefRow[] = updateRecords.map((r) => {
          const brandId = brandIdBySlug.get(r.brandSlug);
          if (!brandId) {
            throw new Error(
              `Unresolved brand "${r.brandName}" (pid ${r.pid}).`,
            );
          }
          return buildFragranceRefRow(r, brandId);
        });
        await updateFragranceRefScalars(tx, updateRows);

        const refIdByPid = new Map<number, string>();
        for (const r of batch) {
          const id = existingIdByPid.get(r.pid) ?? createdIdByPid.get(r.pid);
          if (!id) {
            throw new Error(
              `FragranceRef for pid ${r.pid} was neither found nor created.`,
            );
          }
          refIdByPid.set(r.pid, id);
        }
        const batchRefIds = [...refIdByPid.values()];

        // Relations are always fully replaced for the batch's refs, new or
        // existing, so a rerun with revised note/accord weights or a changed
        // perfumer credit never leaves a stale row behind.
        await tx.fragranceRefNote.deleteMany({
          where: { fragranceRefId: { in: batchRefIds } },
        });
        await tx.fragranceRefAccord.deleteMany({
          where: { fragranceRefId: { in: batchRefIds } },
        });
        await tx.fragranceRefPerfumer.deleteMany({
          where: { fragranceRefId: { in: batchRefIds } },
        });

        const noteRelationRows: {
          fragranceRefId: string;
          noteId: string;
          position: "TOP" | "MIDDLE" | "BASE" | null;
          weight: number;
          sortOrder: number;
        }[] = [];
        const accordRelationRows: {
          fragranceRefId: string;
          accordId: string;
          strength: number;
          sortOrder: number;
        }[] = [];
        const perfumerRelationRows: {
          fragranceRefId: string;
          perfumerId: string;
        }[] = [];

        for (const r of batch) {
          const fragranceRefId = refIdByPid.get(r.pid)!;
          for (const note of r.notes) {
            const noteId = noteIdBySlug.get(note.noteSlug);
            if (!noteId) {
              throw new Error(
                `Unresolved note "${note.name}" (pid ${r.pid}); the translation gate should have prevented this.`,
              );
            }
            noteRelationRows.push({
              fragranceRefId,
              noteId,
              position: note.position,
              weight: note.weight,
              sortOrder: note.sortOrder,
            });
          }
          for (const accord of r.accords) {
            const accordId = accordIdBySlug.get(accord.slug);
            if (!accordId) {
              throw new Error(
                `Unresolved accord "${accord.name}" (pid ${r.pid}); the translation gate should have prevented this.`,
              );
            }
            accordRelationRows.push({
              fragranceRefId,
              accordId,
              strength: accord.strength,
              sortOrder: accord.sortOrder,
            });
          }
          for (const perfumer of r.perfumers) {
            const perfumerId = perfumerIdBySlug.get(perfumer.slug);
            if (!perfumerId) {
              throw new Error(
                `Unresolved perfumer "${perfumer.name}" (pid ${r.pid}); pass 1 should have aggregated it.`,
              );
            }
            perfumerRelationRows.push({ fragranceRefId, perfumerId });
          }
        }

        if (noteRelationRows.length > 0) {
          await tx.fragranceRefNote.createMany({ data: noteRelationRows });
        }
        if (accordRelationRows.length > 0) {
          await tx.fragranceRefAccord.createMany({ data: accordRelationRows });
        }
        if (perfumerRelationRows.length > 0) {
          await tx.fragranceRefPerfumer.createMany({
            data: perfumerRelationRows,
          });
        }

        refsCreated += newRows.length;
        refsUpdated += updateRows.length;
      },
      { timeout: 120_000, maxWait: 30_000 },
    );

    processed += batch.length;
    const pct = ((processed / recordCount) * 100).toFixed(1);
    console.log(
      `  ${fmt(processed)}/${fmt(recordCount)} (${pct}%) — elapsed ${elapsedSeconds(passStartedAt)}s`,
    );
  };

  for await (const record of streamRecords()) {
    batchRecords.push(record);
    if (batchRecords.length >= batchSize) await flushBatch();
  }
  await flushBatch();

  // ---------------------------------------------------------------------
  // usageCount is only knowable after every FragranceRefNote row exists.
  // ---------------------------------------------------------------------
  console.log("Recalculating each note's usage count...");
  const updatedNoteCount = await prisma.$executeRaw`
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
  console.log(`  ${fmt(updatedNoteCount)} notes with an updated usage count`);

  const summary: ImportSummary = {
    records: recordCount,
    refsCreated,
    refsUpdated,
    brands: brandIdBySlug.size,
    perfumers: perfumerIdBySlug.size,
    notes: noteIdBySlug.size,
    accords: accordIdBySlug.size,
    yearOutOfRangeCount,
  };

  console.log("\nDone:");
  console.log(`  records processed: ${fmt(summary.records)}`);
  console.log(
    `  FragranceRef rows: ${fmt(summary.refsCreated)} created, ${fmt(summary.refsUpdated)} updated`,
  );
  console.log(
    `  dimensions: ${fmt(summary.brands)} brands, ${fmt(summary.perfumers)} perfumers, ${fmt(summary.notes)} notes, ${fmt(summary.accords)} accords`,
  );
  console.log(
    `  ${fmt(summary.yearOutOfRangeCount)} registros con año fuera de rango se importan sin año`,
  );
  console.log(`  elapsed: ${elapsedSeconds(startedAt)}s`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
