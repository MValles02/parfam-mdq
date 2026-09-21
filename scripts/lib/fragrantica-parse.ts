/**
 * Pure parsers for data/fragrantica/ CSV files. They do no I/O and receive
 * strings to return typed data, so tests do not need the filesystem or DB.
 *
 * Each source format is documented in data/fragrantica/README.md.
 */

export type Gender = "WOMEN" | "MEN" | "UNISEX";

export interface UrlParts {
  pid: number;
  brandName: string;
  name: string;
}

/**
 * Extracts a PID, brand, and name from a Fragrantica URL:
 *   https://www.fragrantica.com/perfume/Jean-Paul-Gaultier/Scandal-A-Paris-54275.html
 *   -> { pid: 54275, brandName: "Jean Paul Gaultier", name: "Scandal A Paris" }
 * URL segments already have appropriate capitalization; only hyphens need
 * replacement with spaces.
 */
export function parseFragranticaUrl(url: string): UrlParts | null {
  const m = /\/perfume\/([^/]+)\/([^/]+)-(\d+)\.html?$/i.exec(url.trim());
  if (!m) return null;
  const [, brandSeg, nameSeg, pidStr] = m;
  const pid = Number.parseInt(pidStr, 10);
  if (!Number.isFinite(pid)) return null;
  return {
    pid,
    brandName: dehyphenate(brandSeg),
    name: dehyphenate(nameSeg),
  };
}

function dehyphenate(segment: string): string {
  return decodeURIComponent(segment)
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * fra_cleaned.csv provides Brand/Perfume as lowercase slugs
 * ("jean-paul-gaultier"), so this also applies title case because original
 * capitalization is unavailable.
 */
export function titleCaseFromSlug(slug: string): string {
  return dehyphenate(slug)
    .split(" ")
    .map((w) => (w.length <= 3 && w === w.toLowerCase() ? w : capitalize(w)))
    .join(" ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function capitalize(w: string): string {
  if (!w) return w;
  return w[0]!.toUpperCase() + w.slice(1);
}

/** Normalizes fra_cleaned.csv gender values. */
export function normalizeGenderCleaned(raw: string): Gender | null {
  const v = raw.trim().toLowerCase();
  if (v === "women") return "WOMEN";
  if (v === "men") return "MEN";
  if (v === "unisex") return "UNISEX";
  return null;
}

/** Normalizes fra_perfumes.csv prose gender values. */
export function normalizeGenderPerfumes(raw: string): Gender | null {
  const v = raw.trim().toLowerCase();
  if (v === "for women") return "WOMEN";
  if (v === "for men") return "MEN";
  if (v === "for women and men") return "UNISEX";
  return null;
}

/**
 * Splits a prose list ("Lemon, Mint, Black Currant and Pink Pepper") into
 * items. The comma before "and" is optional.
 */
export function splitProseList(raw: string): string[] {
  const cleaned = raw.trim().replace(/\.$/, "");
  if (!cleaned) return [];
  const withoutFinalAnd = cleaned.replace(/,?\s+and\s+/i, ", ");
  return withoutFinalAnd
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface Pyramid {
  top: string[];
  middle: string[];
  base: string[];
}

const RE_TOP = /top notes? (?:are|is) ([^;.]+)/i;
const RE_MIDDLE = /middle notes? (?:are|is) ([^;.]+)/i;
const RE_BASE = /base notes? (?:are|is) ([^;.]+)/i;
const RE_FLAT = /(?<!top |middle |base )notes? (?:are|is) ([^;.]+)/i;
const RE_YEAR = /was launched in (\d{4})/i;

/**
 * Parses the pyramid from an English fra_perfumes.csv description. It returns
 * null when no known pattern matches, which happens for about 33% of rows.
 */
export function parsePyramidFromDescription(
  description: string,
): Pyramid | null {
  const top = RE_TOP.exec(description);
  const middle = RE_MIDDLE.exec(description);
  const base = RE_BASE.exec(description);
  if (top || middle || base) {
    return {
      top: top ? splitProseList(top[1]!) : [],
      middle: middle ? splitProseList(middle[1]!) : [],
      base: base ? splitProseList(base[1]!) : [],
    };
  }
  const flat = RE_FLAT.exec(description);
  if (flat) {
    // Fragrances without defined levels ("Notes are X, Y, Z") place all notes
    // at TOP, the closest approximation that retains the data.
    return { top: splitProseList(flat[1]!), middle: [], base: [] };
  }
  return null;
}

export function parseYearFromDescription(description: string): number | null {
  const m = RE_YEAR.exec(description);
  return m ? Number.parseInt(m[1]!, 10) : null;
}

/**
 * Parses a Python `repr()` list: `['A', 'B']`, `["O'Connor"]`, or empty `[]`.
 * Each entry may use single or double quotes.
 */
export function parsePyStringList(raw: string): string[] {
  const s = raw.trim();
  if (!s || s === "[]") return [];
  const items: string[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === "'" || ch === '"') {
      const quote = ch;
      let j = i + 1;
      let value = "";
      while (j < s.length && s[j] !== quote) {
        if (s[j] === "\\" && j + 1 < s.length) {
          value += s[j + 1];
          j += 2;
        } else {
          value += s[j];
          j += 1;
        }
      }
      items.push(value);
      i = j + 1;
    } else {
      i += 1;
    }
  }
  return items;
}

/** Parses "1,42" from fra_cleaned or "3.73" from fra_perfumes into a number. */
export function parseDecimal(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const v = raw.trim().replace(",", ".");
  if (!v) return null;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function parseIntOrNull(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
