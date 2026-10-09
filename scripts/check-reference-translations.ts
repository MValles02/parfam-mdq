/**
 * Verifies that every note and accord used by new-database/perfumes.jsonl
 * (the Fragrantica reference-catalog dump; see new-database/SCHEMA.md) has a
 * Spanish translation committed in prisma/reference/{notes,accords}.es.json,
 * per AGENTS.md: scripts/import-references.ts refuses to load a slug this
 * repo has no Spanish copy for, and this report shows which ones are missing
 * before an import is attempted. It streams the dataset once — 140k+
 * records is too large to hold in memory as parsed JSON — instead of loading
 * it whole.
 *
 *   pnpm db:check-translations
 *   pnpm db:check-translations --file new-database/samples/perfumes.jsonl
 *   pnpm db:check-translations --emit-missing /tmp/missing.json
 *
 * pnpm forwards flags to the script directly, so no `--` separator is needed
 * (one would reach the strict argument parser as a stray positional).
 *
 * Exits 0 when every used slug is translated, 1 otherwise.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { formatCount, formatYearOutOfRangeSummary } from "./lib/cli-format";
import { countYearOutOfRangeWarnings } from "./lib/reference-parse";
import { SlugFrequencyTracker } from "./lib/slug-frequency";
import {
  DEFAULT_DATASET_PATH,
  ReferenceRecordReader,
} from "./lib/reference-jsonl";
import {
  ACCORDS_TRANSLATION_FILE,
  DEFAULT_TRANSLATIONS_DIR,
  NOTES_TRANSLATION_FILE,
  countMissingTranslations,
  findMissingTranslations,
  loadReferenceTranslations,
  type MissingTranslationsReport,
} from "./lib/reference-translations";
import { buildMissingTranslationsSkeleton } from "./lib/translation-skeleton";

const { values } = parseArgs({
  options: {
    file: { type: "string", default: DEFAULT_DATASET_PATH },
    "emit-missing": { type: "string" },
  },
});

const filePath = path.resolve(process.cwd(), values.file!);

async function main(): Promise<void> {
  const { noteFrequency, accordFrequency } = await scanDataset();

  const translations = loadReferenceTranslations();
  const report = findMissingTranslations(
    { noteSlugs: noteFrequency.slugs(), accordSlugs: accordFrequency.slugs() },
    translations,
  );

  console.log(
    `Notes:   ${formatCount(noteFrequency.slugs().length)} distinct, ${formatCount(report.missingNotes.length)} missing, ${formatCount(report.unusedNotes.length)} unused`,
  );
  console.log(
    `Accords: ${formatCount(accordFrequency.slugs().length)} distinct, ${formatCount(report.missingAccords.length)} missing, ${formatCount(report.unusedAccords.length)} unused`,
  );

  if (values["emit-missing"]) {
    writeMissingSkeleton(values["emit-missing"], {
      report,
      noteFrequency,
      accordFrequency,
    });
  }

  const missingTotal = countMissingTranslations(report);
  if (missingTotal > 0) {
    console.error(
      `\n${formatCount(missingTotal)} slug(s) have no Spanish translation. The importer refuses to load until ${DEFAULT_TRANSLATIONS_DIR}/${NOTES_TRANSLATION_FILE} and ${DEFAULT_TRANSLATIONS_DIR}/${ACCORDS_TRANSLATION_FILE} cover every note and accord above.`,
    );
    process.exit(1);
  }

  console.log("\nEvery note and accord used by the dataset is translated.");
}

/**
 * Streams the dataset once and records, per note and accord slug, how many
 * times each exact display-name casing occurred. The dataset does not
 * normalize casing (e.g. "Bergamot" vs. a rarer "bergamot"), and
 * prisma/reference/notes.es.json documents `en` as "the most frequent casing
 * seen" — so a translator does not have to re-derive it from the raw dataset
 * by hand.
 */
async function scanDataset() {
  console.log(`Reading ${filePath} ...`);
  const noteFrequency = new SlugFrequencyTracker();
  const accordFrequency = new SlugFrequencyTracker();
  const reader = new ReferenceRecordReader(filePath);
  let recordCount = 0;
  let yearOutOfRangeCount = 0;
  for await (const record of reader) {
    recordCount += 1;
    yearOutOfRangeCount += countYearOutOfRangeWarnings(record);
    for (const note of record.notes) {
      noteFrequency.record(note.noteSlug, note.name);
    }
    for (const accord of record.accords) {
      accordFrequency.record(accord.slug, accord.name);
    }
  }

  console.log(
    `  ${formatCount(recordCount)} records parsed from ${formatCount(reader.linesRead)} lines`,
  );
  console.log(formatYearOutOfRangeSummary(yearOutOfRangeCount));
  return { noteFrequency, accordFrequency };
}

function writeMissingSkeleton(
  outFile: string,
  {
    report,
    noteFrequency,
    accordFrequency,
  }: {
    report: MissingTranslationsReport;
    noteFrequency: SlugFrequencyTracker;
    accordFrequency: SlugFrequencyTracker;
  },
): void {
  const outPath = path.resolve(process.cwd(), outFile);
  const skeleton = buildMissingTranslationsSkeleton(
    report,
    noteFrequency,
    accordFrequency,
  );
  writeFileSync(outPath, `${JSON.stringify(skeleton, null, 2)}\n`, "utf-8");
  console.log(`Missing-translation skeleton written to ${outPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
