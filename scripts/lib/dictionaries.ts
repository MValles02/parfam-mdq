import { readFileSync } from "node:fs";
import path from "node:path";

const DICT_DIR = path.join(process.cwd(), "data", "dictionaries");

export interface AccordDictEntry {
  slug: string;
  en: string;
  es: string;
  family: string;
  color: string;
  usageCount: number;
}

export interface NoteDictEntry {
  slug: string;
  en: string;
  es: string;
  usageCount: number;
}

/** slug -> canonical English name, used to merge dataset typos. */
export function loadNoteAliases(): Map<string, string> {
  const raw = JSON.parse(
    readFileSync(path.join(DICT_DIR, "note-aliases.json"), "utf-8"),
  ) as Record<string, string>;
  const map = new Map<string, string>();
  for (const [from, to] of Object.entries(raw)) {
    if (from.startsWith("_")) continue;
    map.set(from.toLowerCase(), to.toLowerCase());
  }
  return map;
}

/** Lowercase English name as it appears in CSV files -> dictionary entry. */
export function loadAccordDict(): Map<string, AccordDictEntry> {
  const list = JSON.parse(
    readFileSync(path.join(DICT_DIR, "accords.es.json"), "utf-8"),
  ) as AccordDictEntry[];
  return new Map(list.map((e) => [e.en.toLowerCase(), e]));
}

export function loadNoteDict(): Map<string, NoteDictEntry> {
  const list = JSON.parse(
    readFileSync(path.join(DICT_DIR, "notes.es.json"), "utf-8"),
  ) as NoteDictEntry[];
  return new Map(list.map((e) => [e.en.toLowerCase(), e]));
}
