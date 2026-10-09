/**
 * Parses a raw record's perfumer, accord, and note lists (see
 * scripts/lib/reference-record-schema.ts) into deduplicated, ordered entries,
 * and defines the slugs that identify each note, accord, and perfumer.
 * Pure: no database, file, or network I/O.
 */

import { toSlug } from "../../src/lib/slug";
import type { ReferenceRecord } from "./reference-record-schema";

/** Mirrors the Prisma `NotePosition` enum; see `Gender` in scripts/lib/reference-parse.ts for why it is not imported. */
export type NotePosition = "TOP" | "MIDDLE" | "BASE";

/**
 * A note's identity, for deduplication purposes, is its own display name —
 * not the dataset's "family" slug (kept separately, see `ParsedNote.family`
 * below). Two different display names can share a family (e.g. "Calabrian
 * bergamot" and "Sicilian Bergamot" both carry the family slug "Bergamot"),
 * and collapsing them into one note would silently discard the distinction
 * an administrator may care about when writing the Spanish product copy.
 */
export function toNoteSlug(name: string): string {
  return toSlug(name.trim().toLowerCase());
}

export interface ParsedPerfumer {
  name: string;
  slug: string;
}

export interface ParsedAccord {
  name: string;
  slug: string;
  strength: number;
  sortOrder: number;
}

export interface ParsedNote {
  name: string;
  noteSlug: string;
  /** The dataset's own note slug, kept as given (e.g. "Bergamot"); several display names can share one family, see `toNoteSlug`. */
  family: string;
  position: NotePosition | null;
  /**
   * 0..100, normalized so the perfume's strongest note is 100. A note at
   * weight 0 is not "faint" — every note in the pyramid sits at 0 exactly
   * when nobody has voted on this perfume's ingredients yet, so a record's
   * all-zero weights are preserved rather than treated as missing data.
   */
  weight: number;
  sortOrder: number;
}

/** Weights and accord strengths are both documented as integers 0..100. */
const UNIT_SCORE_RANGE = { min: 0, max: 100 } as const;

function assertUnitScore(
  value: number,
  kind: "weight" | "strength",
  pid: number,
): void {
  const { min, max } = UNIT_SCORE_RANGE;
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(
      `Reference record ${pid}: ${kind} must be an integer between ${min} and ${max}, got ${value}.`,
    );
  }
}

/**
 * The perfumer slug comes from the dataset's own `perfumers[].slug` (e.g.
 * "Nathalie_Feisthauer"), not from re-slugifying the display name: keeping
 * the dataset's identity key is what lets two credits with different display
 * casing or accents still resolve to the same Perfumer row. That dataset
 * slug is not itself a clean URL slug, though — measuring it against the
 * real 140k-record dataset (see scripts/import-references.ts) found two
 * quirks `toSlug` alone does not undo: words are separated with `_` instead
 * of `-` (so "Nathalie_Feisthauer" would slugify to "nathaliefeisthauer",
 * losing the word boundary), and any non-ASCII character is left as an
 * undecoded percent-escape rather than the actual UTF-8 character (e.g.
 * "Sophie_Labb%C3%A9" for "Sophie Labbé", which `toSlug` would otherwise turn
 * into the unreadable "sophielabbpercentc3percenta9"). `normalizePerfumerSlug`
 * percent-decodes the raw slug (falling back to the raw string if the escape
 * itself is malformed, e.g. a stray "%ZZ") and turns `_` into a space before
 * handing the result to `toSlug`. Falls back to `toSlug(name)` when the
 * dataset slug is empty, or when normalizing it yields an empty string.
 */
function normalizePerfumerSlug(datasetSlug: string, name: string): string {
  const trimmed = datasetSlug.trim();
  if (trimmed === "") return toSlug(name);
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    // Malformed percent-escape (e.g. "Bad%ZZ"): keep the raw slug rather
    // than letting a corrupt dataset value abort the whole import.
  }
  const slug = toSlug(decoded.replace(/_/g, " "));
  return slug !== "" ? slug : toSlug(name);
}

export function parsePerfumers(
  raw: ReferenceRecord["perfumers"],
): ParsedPerfumer[] {
  const seenSlugs = new Set<string>();
  const result: ParsedPerfumer[] = [];
  for (const perfumer of raw) {
    const name = perfumer.name.trim();
    const slug = normalizePerfumerSlug(perfumer.slug, name);
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    result.push({ name, slug });
  }
  return result;
}

export function parseAccords(
  raw: ReferenceRecord["accords"],
  pid: number,
): ParsedAccord[] {
  const seenSlugs = new Set<string>();
  const result: ParsedAccord[] = [];
  raw.forEach((accord, index) => {
    assertUnitScore(accord.strength, "strength", pid);
    const name = accord.name.trim();
    const slug = toSlug(name);
    if (seenSlugs.has(slug)) return;
    seenSlugs.add(slug);
    result.push({ name, slug, strength: accord.strength, sortOrder: index });
  });
  return result;
}

function parseNoteItems(
  items: ReferenceRecord["notes"]["flat"],
  position: NotePosition | null,
  pid: number,
): ParsedNote[] {
  const seenNoteSlugs = new Set<string>();
  const result: ParsedNote[] = [];
  items.forEach((item, index) => {
    assertUnitScore(item.weight, "weight", pid);
    const name = item.name.trim();
    const noteSlug = toNoteSlug(name);
    if (seenNoteSlugs.has(noteSlug)) return;
    seenNoteSlugs.add(noteSlug);
    result.push({
      name,
      noteSlug,
      family: item.slug,
      position,
      weight: item.weight,
      sortOrder: index,
    });
  });
  return result;
}

export function parseNotes(
  raw: ReferenceRecord["notes"],
  pid: number,
): ParsedNote[] {
  const { tiered, flat } = raw;
  const hasTiered =
    tiered.top.length > 0 || tiered.middle.length > 0 || tiered.base.length > 0;
  const hasFlat = flat.length > 0;

  if (hasTiered && hasFlat) {
    throw new Error(
      `Reference record ${pid}: has both tiered and flat notes; the dataset documents these as mutually exclusive.`,
    );
  }

  if (hasFlat) return parseNoteItems(flat, null, pid);

  // Deduplication is scoped per tier (a fresh Set per parseNoteItems call),
  // matching the spec: duplicates of the same noteSlug within the SAME
  // position keep the first, but the same note can legitimately appear once
  // per tier (rare, but not a data error).
  return [
    ...parseNoteItems(tiered.top, "TOP", pid),
    ...parseNoteItems(tiered.middle, "MIDDLE", pid),
    ...parseNoteItems(tiered.base, "BASE", pid),
  ];
}
