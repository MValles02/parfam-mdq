/**
 * Verifies that every note and accord used by new-database/perfumes.jsonl
 * (the Fragrantica reference-catalog dump; see new-database/SCHEMA.md) has a
 * Spanish translation committed in prisma/reference/{notes,accords}.es.json,
 * per AGENTS.md: the future importer must refuse to load a slug this repo
 * has no Spanish copy for. This script streams the dataset once — 140k+
 * records is too large to hold in memory as parsed JSON — instead of loading
 * it whole.
 *
 *   pnpm db:check-translations
 *   pnpm db:check-translations -- --file new-database/samples/perfumes.jsonl
 *   pnpm db:check-translations -- --emit-missing /tmp/missing.json
 *
 * Exits 0 when every used slug is translated, 1 otherwise.
 */
import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import { parseArgs } from "node:util";
import { parseReferenceRecord } from "./lib/reference-parse";
import {
  findMissingTranslations,
  loadReferenceTranslations,
  type MissingTranslationsReport,
} from "./lib/reference-translations";

const { values } = parseArgs({
  options: {
    file: { type: "string", default: "new-database/perfumes.jsonl" },
    "emit-missing": { type: "string" },
  },
});

const filePath = path.resolve(process.cwd(), values.file!);

function fmt(n: number): string {
  return n.toLocaleString("es-AR");
}

/**
 * Tracks, per slug, how many times each exact display-name casing occurred
 * in the dataset. The dataset does not normalize casing (e.g. "Bergamot" vs.
 * a rarer "bergamot"), and prisma/reference/notes.es.json documents `en` as
 * "the most frequent casing seen" — so a translator does not have to go
 * re-derive that from the raw dataset by hand.
 */
class SlugFrequency {
  private readonly namesBySlug = new Map<string, Map<string, number>>();

  record(slug: string, name: string): void {
    let names = this.namesBySlug.get(slug);
    if (!names) {
      names = new Map();
      this.namesBySlug.set(slug, names);
    }
    names.set(name, (names.get(name) ?? 0) + 1);
  }

  slugs(): string[] {
    return [...this.namesBySlug.keys()];
  }

  /** Total occurrences of the slug, across every display-name casing. */
  totalCount(slug: string): number {
    const names = this.namesBySlug.get(slug);
    if (!names) return 0;
    let total = 0;
    for (const count of names.values()) total += count;
    return total;
  }

  /** The single most frequently seen display-name casing for this slug. */
  mostFrequentName(slug: string): string {
    const names = this.namesBySlug.get(slug);
    if (!names || names.size === 0) {
      throw new Error(`No display name was ever recorded for slug "${slug}".`);
    }
    let best: { name: string; count: number } | null = null;
    for (const [name, count] of names) {
      if (best === null || count > best.count) best = { name, count };
    }
    return best!.name;
  }
}

/** Descending by total occurrences, so translators tackle the common slugs first; ties broken alphabetically for a stable, reviewable diff. */
function sortByDescendingFrequency(
  slugs: string[],
  frequency: SlugFrequency,
): string[] {
  return [...slugs].sort((a, b) => {
    const diff = frequency.totalCount(b) - frequency.totalCount(a);
    return diff !== 0 ? diff : a.localeCompare(b);
  });
}

/**
 * Writes a JSON skeleton for the missing entries, in the exact per-entry
 * shape prisma/reference/{notes,accords}.es.json expect (so a filled-in
 * section can be pasted straight into the real file), plus a `_counts`
 * section with occurrence totals. Occurrence counts are deliberately kept
 * out of the per-entry shape: notes.es.json and accords.es.json only ever
 * hold `{en, es}` / `{en, es, color}`, so a `count` field there would fail
 * the file's own schema.
 */
function writeMissingSkeleton(
  outPath: string,
  report: MissingTranslationsReport,
  noteFrequency: SlugFrequency,
  accordFrequency: SlugFrequency,
): void {
  const sortedMissingNotes = sortByDescendingFrequency(
    report.missingNotes,
    noteFrequency,
  );
  const sortedMissingAccords = sortByDescendingFrequency(
    report.missingAccords,
    accordFrequency,
  );

  const notes: Record<string, { en: string; es: string }> = {};
  const noteCounts: Record<string, number> = {};
  for (const slug of sortedMissingNotes) {
    notes[slug] = { en: noteFrequency.mostFrequentName(slug), es: "" };
    noteCounts[slug] = noteFrequency.totalCount(slug);
  }

  const accords: Record<string, { en: string; es: string; color: string }> = {};
  const accordCounts: Record<string, number> = {};
  for (const slug of sortedMissingAccords) {
    accords[slug] = {
      en: accordFrequency.mostFrequentName(slug),
      es: "",
      color: "",
    };
    accordCounts[slug] = accordFrequency.totalCount(slug);
  }

  const skeleton = {
    notes,
    accords,
    _counts: { notes: noteCounts, accords: accordCounts },
  };

  writeFileSync(outPath, `${JSON.stringify(skeleton, null, 2)}\n`, "utf-8");
}

async function main(): Promise<void> {
  console.log(`Reading ${filePath} ...`);

  const noteFrequency = new SlugFrequency();
  const accordFrequency = new SlugFrequency();

  const rl = createInterface({
    input: createReadStream(filePath, "utf-8"),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  let recordCount = 0;
  // Currently the only warning `parseReferenceRecord` ever produces is a
  // year outside the plausible range (see normalizeYear in
  // scripts/lib/reference-parse.ts), so counting warning entries doubles as
  // counting those records; this comment is the tripwire to revisit the
  // count if a second kind of warning is ever added.
  let yearOutOfRangeCount = 0;
  for await (const line of rl) {
    lineNumber += 1;
    if (line.trim() === "") continue;

    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch (error) {
      throw new Error(
        `${filePath}:${lineNumber}: line is not valid JSON (${(error as Error).message}).`,
      );
    }

    const record = parseReferenceRecord(json);
    recordCount += 1;
    yearOutOfRangeCount += (record.warnings ?? []).length;
    for (const note of record.notes) {
      noteFrequency.record(note.noteSlug, note.name);
    }
    for (const accord of record.accords) {
      accordFrequency.record(accord.slug, accord.name);
    }
  }

  console.log(
    `  ${fmt(recordCount)} records parsed from ${fmt(lineNumber)} lines`,
  );
  console.log(
    `  ${fmt(yearOutOfRangeCount)} registros con año fuera de rango se importan sin año`,
  );

  const translations = loadReferenceTranslations();
  const report = findMissingTranslations(
    { noteSlugs: noteFrequency.slugs(), accordSlugs: accordFrequency.slugs() },
    translations,
  );

  console.log(
    `Notes:   ${fmt(noteFrequency.slugs().length)} distinct, ${fmt(report.missingNotes.length)} missing, ${fmt(report.unusedNotes.length)} unused`,
  );
  console.log(
    `Accords: ${fmt(accordFrequency.slugs().length)} distinct, ${fmt(report.missingAccords.length)} missing, ${fmt(report.unusedAccords.length)} unused`,
  );

  if (values["emit-missing"]) {
    const outPath = path.resolve(process.cwd(), values["emit-missing"]);
    writeMissingSkeleton(outPath, report, noteFrequency, accordFrequency);
    console.log(`Missing-translation skeleton written to ${outPath}`);
  }

  const missingTotal =
    report.missingNotes.length + report.missingAccords.length;
  if (missingTotal > 0) {
    console.error(
      `\n${fmt(missingTotal)} slug(s) have no Spanish translation. The importer refuses to load until prisma/reference/notes.es.json and prisma/reference/accords.es.json cover every note and accord above.`,
    );
    process.exit(1);
  }

  console.log("\nEvery note and accord used by the dataset is translated.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
