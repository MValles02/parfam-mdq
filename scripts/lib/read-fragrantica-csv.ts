import { readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseCsvSync } from "csv-parse/sync";
import {
  parseFragranticaUrl,
  normalizeGenderCleaned,
  normalizeGenderPerfumes,
  splitProseList,
  parsePyramidFromDescription,
  parseYearFromDescription,
  parsePyStringList,
  parseDecimal,
  parseIntOrNull,
  type Gender,
  type Pyramid,
} from "./fragrantica-parse";

export interface MergedFragrance {
  pid: number;
  url: string;
  brandName: string;
  name: string;
  year: number | null;
  gender: Gender | null;
  ratingValue: number | null;
  ratingCount: number | null;
  descriptionEn: string | null;
  originCountry: string | null;
  /** Unnormalized perfumer names, resolved to slugs on write. */
  perfumerNames: string[];
  /** Lowercase accord names in dataset order. */
  accordNames: string[];
  pyramid: Pyramid | null;
}

interface Options {
  dataDir: string;
}

/**
 * Reads and merges fra_perfumes.csv + fra_cleaned.csv into a PID map.
 * fra_perfumes.csv is the complete PID base; fra_cleaned.csv enriches or
 * overrides fields where it has better data.
 */
export function readAndMergeFragrantica(
  opts: Options,
): Map<number, MergedFragrance> {
  const merged = new Map<number, MergedFragrance>();

  // ---- fra_perfumes.csv (utf-8, comma delimiter) — base ------------------
  const perfumesPath = path.join(opts.dataDir, "fra_perfumes.csv");
  const perfumesRaw = readFileSync(perfumesPath, "utf-8");
  const perfumesRows = parseCsvSync(perfumesRaw, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];

  for (const row of perfumesRows) {
    const parts = parseFragranticaUrl(row.url ?? "");
    if (!parts) continue;
    if (merged.has(parts.pid)) continue; // fra_perfumes.csv has about 155 duplicate PIDs

    const description = row.Description ?? "";
    const pyramid = parsePyramidFromDescription(description);
    const accordNames = parsePyStringList(row["Main Accords"] ?? "[]").map(
      (a) => a.toLowerCase(),
    );

    merged.set(parts.pid, {
      pid: parts.pid,
      url: row.url!,
      brandName: parts.brandName,
      name: parts.name,
      year: parseYearFromDescription(description),
      gender: normalizeGenderPerfumes(row.Gender ?? ""),
      ratingValue: parseDecimal(row["Rating Value"]),
      ratingCount: parseIntOrNull(row["Rating Count"]),
      descriptionEn: description || null,
      originCountry: null,
      perfumerNames: parsePyStringList(row.Perfumers ?? "[]"),
      accordNames,
      pyramid: pyramid
        ? {
            top: pyramid.top.map((n) => n.toLowerCase()),
            middle: pyramid.middle.map((n) => n.toLowerCase()),
            base: pyramid.base.map((n) => n.toLowerCase()),
          }
        : null,
    });
  }

  // ---- fra_cleaned.csv (windows-1252, semicolon delimiter) — enriches -----
  const cleanedPath = path.join(opts.dataDir, "fra_cleaned.csv");
  const cleanedBuffer = readFileSync(cleanedPath);
  const cleanedText = new TextDecoder("windows-1252").decode(cleanedBuffer);
  const cleanedRows = parseCsvSync(cleanedText, {
    columns: true,
    delimiter: ";",
    skip_empty_lines: true,
  }) as Record<string, string>[];

  for (const row of cleanedRows) {
    const parts = parseFragranticaUrl(row.url ?? "");
    if (!parts) continue;

    const existing = merged.get(parts.pid);
    const base: MergedFragrance =
      existing ??
      ({
        pid: parts.pid,
        url: row.url!,
        brandName: parts.brandName,
        name: parts.name,
        year: null,
        gender: null,
        ratingValue: null,
        ratingCount: null,
        descriptionEn: null,
        originCountry: null,
        perfumerNames: [],
        accordNames: [],
        pyramid: null,
      } satisfies MergedFragrance);

    const gender = normalizeGenderCleaned(row.Gender ?? "");
    const year = parseIntOrNull(row.Year);
    const ratingValue = parseDecimal(row["Rating Value"]);
    const ratingCount = parseIntOrNull(row["Rating Count"]);
    const country = row.Country?.trim() || null;

    const perfumerNames = [row.Perfumer1, row.Perfumer2]
      .map((p) => p?.trim())
      .filter((p): p is string => Boolean(p) && p!.toLowerCase() !== "unknown");

    const accordNames = [1, 2, 3, 4, 5]
      .map((i) => row[`mainaccord${i}`]?.trim().toLowerCase())
      .filter((a): a is string => Boolean(a) && a !== "unknown");

    const top = row.Top?.trim();
    const pyramid: Pyramid | null =
      top && top.toLowerCase() !== "unknown"
        ? {
            top: splitProseList(row.Top ?? "").map((n) => n.toLowerCase()),
            middle: splitProseList(row.Middle ?? "").map((n) =>
              n.toLowerCase(),
            ),
            base: splitProseList(row.Base ?? "").map((n) => n.toLowerCase()),
          }
        : null;

    merged.set(parts.pid, {
      ...base,
      gender: gender ?? base.gender,
      year: year ?? base.year,
      ratingValue: ratingValue ?? base.ratingValue,
      ratingCount: ratingCount ?? base.ratingCount,
      originCountry: country ?? base.originCountry,
      perfumerNames:
        perfumerNames.length > 0 ? perfumerNames : base.perfumerNames,
      accordNames: accordNames.length > 0 ? accordNames : base.accordNames,
      pyramid: pyramid ?? base.pyramid,
    });
  }

  return merged;
}
