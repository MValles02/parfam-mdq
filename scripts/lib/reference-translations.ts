/**
 * Loader and coverage-checking helpers for the Spanish translations of the
 * reference catalog's notes and accords (prisma/reference/notes.es.json and
 * prisma/reference/accords.es.json).
 *
 * The store shows customer-facing copy in Spanish (see AGENTS.md), but
 * new-database/perfumes.jsonl (the Fragrantica dump the importer reads) only
 * has English note and accord names. Translating ~2,589 notes and 92 accords
 * is a one-time editorial job, not something an administrator should do one
 * product at a time in a panel screen. Requiring the translation files to be
 * complete *before* import — rather than importing English and patching
 * later — means every reference row in Postgres is immediately usable to
 * build a Spanish product page, and nothing silently ships in English.
 *
 * This module does no database or file-system writing and does not import
 * the generated Prisma client, so it stays usable from both the importer and
 * plain unit tests (see reference-translations.test.ts).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { toNoteSlug, toSlug } from "./reference-parse";

const trimmedNonEmpty = z.string().trim().min(1, "must be a non-empty string");

export const noteTranslationEntrySchema = z.object({
  en: trimmedNonEmpty,
  es: trimmedNonEmpty,
});

export const accordTranslationEntrySchema = z.object({
  en: trimmedNonEmpty,
  es: trimmedNonEmpty,
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "must be a hex color like #RRGGBB"),
});

type NoteTranslationEntry = z.infer<typeof noteTranslationEntrySchema>;
type AccordTranslationEntry = z.infer<typeof accordTranslationEntrySchema>;

/**
 * Builds the whole-file schema for one translation file: a map keyed by slug
 * to a validated entry, plus the cross-field rule that the key must be
 * exactly the slug derived from that entry's own `en` name. That rule is
 * what keeps the file self-consistent — a translator cannot rename `en`
 * without the key silently going stale and pointing at the wrong dataset
 * name — so it is checked here rather than left to the importer to notice.
 */
function fileSchema<Entry extends { en: string }>(
  entrySchema: z.ZodType<Entry>,
  slugFromEn: (en: string) => string,
) {
  return z.record(z.string(), entrySchema).superRefine((entries, ctx) => {
    for (const [key, entry] of Object.entries(entries)) {
      if (key.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Key must be a non-empty slug.",
          path: [key],
        });
        continue;
      }
      const expectedSlug = slugFromEn(entry.en);
      if (key !== expectedSlug) {
        ctx.addIssue({
          code: "custom",
          message: `Key "${key}" does not match the slug derived from its "en" name ("${entry.en}" -> "${expectedSlug}").`,
          path: [key],
        });
      }
    }
  });
}

export const notesFileSchema = fileSchema(
  noteTranslationEntrySchema,
  toNoteSlug,
);
export const accordsFileSchema = fileSchema(
  accordTranslationEntrySchema,
  toSlug,
);

export interface ReferenceTranslations {
  notes: Map<string, NoteTranslationEntry>;
  accords: Map<string, AccordTranslationEntry>;
}

function parseTranslationFile<Entry extends { en: string }>(
  filePath: string,
  schema: ReturnType<typeof fileSchema<Entry>>,
): Record<string, Entry> {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch (error) {
    throw new Error(
      `Could not read translation file ${filePath}: ${(error as Error).message}`,
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `${filePath} is not valid JSON: ${(error as Error).message}`,
    );
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues
      .map(
        (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
      )
      .join("\n");
    throw new Error(`${filePath} failed validation:\n${issues}`);
  }
  return result.data;
}

/**
 * Reads and validates both translation files from `dir` (relative paths are
 * resolved against `process.cwd()`, matching how every other script in this
 * repository is invoked from the project root via `pnpm`).
 */
export function loadReferenceTranslations(
  dir = "prisma/reference",
): ReferenceTranslations {
  const baseDir = path.resolve(dir);
  const notes = parseTranslationFile(
    path.join(baseDir, "notes.es.json"),
    notesFileSchema,
  );
  const accords = parseTranslationFile(
    path.join(baseDir, "accords.es.json"),
    accordsFileSchema,
  );
  return {
    notes: new Map(Object.entries(notes)),
    accords: new Map(Object.entries(accords)),
  };
}

interface ReferenceSlugs {
  noteSlugs: Iterable<string>;
  accordSlugs: Iterable<string>;
}

export interface MissingTranslationsReport {
  /** Note slugs used by the dataset but absent from notes.es.json — the importer must refuse to run while this is non-empty. */
  missingNotes: string[];
  /** Accord slugs used by the dataset but absent from accords.es.json. */
  missingAccords: string[];
  /** Note slugs translated but no longer (or not yet) used by the dataset; harmless, but worth surfacing so the file does not accumulate dead entries. */
  unusedNotes: string[];
  /** Accord slugs translated but no longer (or not yet) used by the dataset. */
  unusedAccords: string[];
}

/**
 * Pure set comparison between the slugs a dataset scan found and the slugs a
 * loaded translation file covers. Kept free of any file or network I/O so it
 * is trivial to unit test with hand-built inputs.
 */
export function findMissingTranslations(
  used: ReferenceSlugs,
  translations: ReferenceTranslations,
): MissingTranslationsReport {
  const usedNoteSlugs = new Set(used.noteSlugs);
  const usedAccordSlugs = new Set(used.accordSlugs);

  const missingNotes = [...usedNoteSlugs]
    .filter((slug) => !translations.notes.has(slug))
    .sort();
  const missingAccords = [...usedAccordSlugs]
    .filter((slug) => !translations.accords.has(slug))
    .sort();
  const unusedNotes = [...translations.notes.keys()]
    .filter((slug) => !usedNoteSlugs.has(slug))
    .sort();
  const unusedAccords = [...translations.accords.keys()]
    .filter((slug) => !usedAccordSlugs.has(slug))
    .sort();

  return { missingNotes, missingAccords, unusedNotes, unusedAccords };
}
