/**
 * Imports the reference catalog from new-database/perfumes.jsonl (gitignored
 * and local-only; see new-database/SCHEMA.md for the record shape) into the
 * Postgres database DATABASE_URL points at: the local one during
 * development, or production through the procedures in docs/deployment.md.
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
 *
 * The database writes themselves live in scripts/lib/reference-writes.ts.
 */
import "dotenv/config";
import path from "node:path";
import { parseArgs } from "node:util";
import { prisma } from "@/lib/db";
import { inBatches } from "./lib/async-batches";
import {
  elapsedSeconds,
  formatCount,
  formatDimensionCounts,
  formatYearOutOfRangeSummary,
} from "./lib/cli-format";
import { ReferenceDimensionAggregator } from "./lib/reference-import";
import {
  DEFAULT_DATASET_PATH,
  ReferenceRecordReader,
} from "./lib/reference-jsonl";
import { countYearOutOfRangeWarnings } from "./lib/reference-parse";
import {
  DEFAULT_TRANSLATIONS_DIR,
  countMissingTranslations,
  findMissingTranslations,
  loadReferenceTranslations,
  type ReferenceTranslations,
} from "./lib/reference-translations";
import {
  loadDimensionIds,
  recalculateNoteUsageCounts,
  upsertDimensions,
  writeReferenceBatch,
  type DimensionIds,
} from "./lib/reference-writes";

const DEFAULT_BATCH_SIZE = 500;

const { values } = parseArgs({
  strict: true,
  options: {
    file: { type: "string", default: DEFAULT_DATASET_PATH },
    limit: { type: "string" },
    "batch-size": { type: "string", default: String(DEFAULT_BATCH_SIZE) },
    "translations-dir": { type: "string", default: DEFAULT_TRANSLATIONS_DIR },
  },
});

const filePath = path.resolve(process.cwd(), values.file!);
const limit = values.limit ? Number.parseInt(values.limit, 10) : undefined;
const batchSize = Number.parseInt(values["batch-size"]!, 10);
const translationsDir = values["translations-dir"]!;

// Both passes iterate this same reader, so they see the exact same bounded
// prefix of the file without ever holding the full 140k+ record dataset in
// memory.
const records = new ReferenceRecordReader(filePath, { limit });

async function main() {
  const startedAt = Date.now();

  const scan = await scanDataset();
  const translations = loadTranslationsOrExit();
  exitUnlessFullyTranslated(scan.aggregator, translations);

  console.log("Writing dimensions...");
  await upsertDimensions(scan.aggregator, translations);
  const ids = await loadDimensionIds();
  const dimensionCounts = {
    brands: ids.brandIdBySlug.size,
    perfumers: ids.perfumerIdBySlug.size,
    notes: ids.noteIdBySlug.size,
    accords: ids.accordIdBySlug.size,
  };
  console.log(`  dimensions ready: ${formatDimensionCounts(dimensionCounts)}`);

  const refs = await writeReferences(scan.recordCount, ids);

  console.log("Recalculating each note's usage count...");
  const updatedNoteCount = await recalculateNoteUsageCounts();
  console.log(
    `  ${formatCount(updatedNoteCount)} notes with an updated usage count`,
  );

  console.log("\nDone:");
  console.log(`  records processed: ${formatCount(scan.recordCount)}`);
  console.log(
    `  FragranceRef rows: ${formatCount(refs.created)} created, ${formatCount(refs.updated)} updated`,
  );
  console.log(`  dimensions: ${formatDimensionCounts(dimensionCounts)}`);
  console.log(formatYearOutOfRangeSummary(scan.yearOutOfRangeCount));
  console.log(`  elapsed: ${elapsedSeconds(startedAt)}s`);
}

/** Pass 1: aggregate every dimension the dataset uses, without writing anything. */
async function scanDataset() {
  console.log(`Pass 1/2: reading ${filePath} ...`);
  const aggregator = new ReferenceDimensionAggregator();
  let recordCount = 0;
  let yearOutOfRangeCount = 0;
  for await (const record of records) {
    aggregator.add(record);
    recordCount += 1;
    yearOutOfRangeCount += countYearOutOfRangeWarnings(record);
  }
  console.log(`  ${formatCount(recordCount)} records parsed`);
  console.log(
    `  detected dimensions: ${formatDimensionCounts({
      brands: aggregator.brands.length,
      perfumers: aggregator.perfumers.length,
      notes: aggregator.noteSlugs.length,
      accords: aggregator.accordSlugs.length,
    })}`,
  );
  return { aggregator, recordCount, yearOutOfRangeCount };
}

function loadTranslationsOrExit(): ReferenceTranslations {
  try {
    return loadReferenceTranslations(translationsDir);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}

/** The translation gate: refuses to write anything while a used slug has no Spanish name. */
function exitUnlessFullyTranslated(
  aggregator: ReferenceDimensionAggregator,
  translations: ReferenceTranslations,
): void {
  const missing = findMissingTranslations(
    { noteSlugs: aggregator.noteSlugs, accordSlugs: aggregator.accordSlugs },
    translations,
  );
  const missingTotal = countMissingTranslations(missing);
  if (missingTotal > 0) {
    console.error(
      `\n${formatCount(missingTotal)} slug(s) used by the dataset have no Spanish translation in ${translationsDir}. Refusing to write to the database.`,
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
}

/**
 * Pass 2: FragranceRef rows and their note/accord/perfumer relations, one
 * transaction per `--batch-size` records, with a progress line per batch.
 */
async function writeReferences(recordCount: number, ids: DimensionIds) {
  console.log(
    `Pass 2/2: writing ${formatCount(recordCount)} reference records...`,
  );
  let created = 0;
  let updated = 0;
  let processed = 0;
  const passStartedAt = Date.now();

  for await (const batch of inBatches(records, batchSize)) {
    const written = await writeReferenceBatch(batch, ids);
    created += written.created;
    updated += written.updated;
    processed += batch.length;
    const pct = ((processed / recordCount) * 100).toFixed(1);
    console.log(
      `  ${formatCount(processed)}/${formatCount(recordCount)} (${pct}%) — elapsed ${elapsedSeconds(passStartedAt)}s`,
    );
  }
  return { created, updated };
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
