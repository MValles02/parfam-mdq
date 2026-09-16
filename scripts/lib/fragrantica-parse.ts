/**
 * Funciones puras de parseo para los CSV de data/fragrantica/.
 * Sin I/O: reciben strings, devuelven datos tipados. Así se pueden testear
 * (scripts/lib/fragrantica-parse.test.ts) sin tocar el filesystem ni la DB.
 *
 * Formato de cada fuente documentado en data/fragrantica/README.md.
 */

export type Gender = "WOMEN" | "MEN" | "UNISEX";

export interface UrlParts {
  pid: number;
  brandName: string;
  name: string;
}

/**
 * Extrae pid/marca/nombre de una URL de Fragrantica:
 *   https://www.fragrantica.com/perfume/Jean-Paul-Gaultier/Scandal-A-Paris-54275.html
 *   -> { pid: 54275, brandName: "Jean Paul Gaultier", name: "Scandal A Paris" }
 * Los segmentos ya vienen bien capitalizados en la URL; sólo hay que
 * reemplazar los guiones por espacios.
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
 * fra_cleaned.csv trae Brand/Perfume como slugs en minúscula
 * ("jean-paul-gaultier"): mismo tratamiento, mas Title Case porque acá no
 * viene con mayúsculas originales.
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

/** Normaliza el género de fra_cleaned.csv ("women" | "men" | "unisex"). */
export function normalizeGenderCleaned(raw: string): Gender | null {
  const v = raw.trim().toLowerCase();
  if (v === "women") return "WOMEN";
  if (v === "men") return "MEN";
  if (v === "unisex") return "UNISEX";
  return null;
}

/** Normaliza el género de fra_perfumes.csv ("for women" | "for men" | "for women and men"). */
export function normalizeGenderPerfumes(raw: string): Gender | null {
  const v = raw.trim().toLowerCase();
  if (v === "for women") return "WOMEN";
  if (v === "for men") return "MEN";
  if (v === "for women and men") return "UNISEX";
  return null;
}

/**
 * Separa una lista en prosa ("Lemon, Mint, Black Currant and Pink Pepper")
 * en items. La coma final antes del "and" es opcional (con o sin Oxford comma).
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
 * Parsea la pirámide desde la descripción en inglés de fra_perfumes.csv.
 * Devuelve null si no matchea ningún patrón conocido (pasa en ~33% de las
 * filas — ver data/fragrantica/README.md).
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
    // Fragancias sin niveles definidos ("Notes are X, Y, Z"): todo a TOP,
    // es la mejor aproximación sin perder el dato.
    return { top: splitProseList(flat[1]!), middle: [], base: [] };
  }
  return null;
}

export function parseYearFromDescription(description: string): number | null {
  const m = RE_YEAR.exec(description);
  return m ? Number.parseInt(m[1]!, 10) : null;
}

/**
 * Parsea una lista al estilo `repr()` de Python: `['A', 'B']`, `["O'Connor"]`,
 * o vacía `[]`. Tolera comillas simples o dobles por elemento (Python usa
 * dobles cuando el string tiene un apóstrofe adentro).
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

/** Parsea "1,42" (fra_cleaned, coma decimal) o "3.73" (fra_perfumes) a número. */
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
