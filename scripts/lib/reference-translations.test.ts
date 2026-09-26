/**
 * Coverage for scripts/lib/reference-translations.ts.
 *   pnpm test -- scripts/lib/reference-translations.test.ts
 *
 * `loadReferenceTranslations` reads from the filesystem, so the "happy path"
 * tests below exercise the real, committed prisma/reference/*.es.json files
 * rather than fixtures — this keeps the committed files honest: they must
 * always be present, structurally valid, and populated.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  accordTranslationEntrySchema,
  accordsFileSchema,
  findMissingTranslations,
  loadReferenceTranslations,
  noteTranslationEntrySchema,
  notesFileSchema,
} from "./reference-translations";

describe("loadReferenceTranslations", () => {
  it("loads the committed translation files", () => {
    const translations = loadReferenceTranslations();
    expect(translations.notes).toBeInstanceOf(Map);
    expect(translations.accords).toBeInstanceOf(Map);
    expect(translations.notes.size).toBeGreaterThan(0);
    expect(translations.accords.size).toBe(92);
    for (const entry of translations.accords.values()) {
      expect(entry.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("loads a directory with valid entries", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "reference-translations-"));
    try {
      writeFileSync(
        path.join(dir, "notes.es.json"),
        JSON.stringify({
          bergamot: { en: "Bergamot", es: "Bergamota" },
        }),
      );
      writeFileSync(
        path.join(dir, "accords.es.json"),
        JSON.stringify({
          citrus: { en: "citrus", es: "cítrico", color: "#F4C430" },
        }),
      );
      const translations = loadReferenceTranslations(dir);
      expect(translations.notes.get("bergamot")).toEqual({
        en: "Bergamot",
        es: "Bergamota",
      });
      expect(translations.accords.get("citrus")).toEqual({
        en: "citrus",
        es: "cítrico",
        color: "#F4C430",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("throws when a translation file is missing", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "reference-translations-"));
    try {
      expect(() => loadReferenceTranslations(dir)).toThrow(/notes\.es\.json/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("noteTranslationEntrySchema / accordTranslationEntrySchema", () => {
  it("accepts a well-formed note entry", () => {
    const result = noteTranslationEntrySchema.safeParse({
      en: "Bergamot",
      es: "Bergamota",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty es", () => {
    const result = noteTranslationEntrySchema.safeParse({
      en: "Bergamot",
      es: "  ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty en", () => {
    const result = noteTranslationEntrySchema.safeParse({
      en: "",
      es: "Bergamota",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed accord entry", () => {
    const result = accordTranslationEntrySchema.safeParse({
      en: "citrus",
      es: "cítrico",
      color: "#F4C430",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a color missing the leading #", () => {
    const result = accordTranslationEntrySchema.safeParse({
      en: "citrus",
      es: "cítrico",
      color: "F4C430",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a color with the wrong length", () => {
    const result = accordTranslationEntrySchema.safeParse({
      en: "citrus",
      es: "cítrico",
      color: "#FFF",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a color with out-of-range hex characters", () => {
    const result = accordTranslationEntrySchema.safeParse({
      en: "citrus",
      es: "cítrico",
      color: "#ZZZZZZ",
    });
    expect(result.success).toBe(false);
  });
});

describe("notesFileSchema / accordsFileSchema key<->en consistency", () => {
  it("accepts a note key that matches toNoteSlug(en)", () => {
    const result = notesFileSchema.safeParse({
      "calabrian-bergamot": {
        en: "Calabrian Bergamot",
        es: "Bergamota Calabresa",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a note key that does not match toNoteSlug(en)", () => {
    const result = notesFileSchema.safeParse({
      bergamot: { en: "Calabrian Bergamot", es: "Bergamota Calabresa" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts an accord key that matches toSlug(en)", () => {
    const result = accordsFileSchema.safeParse({
      citrus: { en: "citrus", es: "cítrico", color: "#F4C430" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an accord key that does not match toSlug(en)", () => {
    const result = accordsFileSchema.safeParse({
      "wrong-slug": { en: "citrus", es: "cítrico", color: "#F4C430" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty key", () => {
    const result = notesFileSchema.safeParse({
      "": { en: "Bergamot", es: "Bergamota" },
    });
    expect(result.success).toBe(false);
  });
});

describe("findMissingTranslations", () => {
  const translations = {
    notes: new Map([
      ["bergamot", { en: "Bergamot", es: "Bergamota" }],
      ["vanilla", { en: "Vanilla", es: "Vainilla" }],
    ]),
    accords: new Map([
      ["citrus", { en: "citrus", es: "cítrico", color: "#F4C430" }],
    ]),
  };

  it("reports slugs used by the dataset but not translated", () => {
    const report = findMissingTranslations(
      { noteSlugs: ["bergamot", "oud"], accordSlugs: ["citrus", "woody"] },
      translations,
    );
    expect(report.missingNotes).toEqual(["oud"]);
    expect(report.missingAccords).toEqual(["woody"]);
  });

  it("reports translated slugs no longer used by the dataset", () => {
    const report = findMissingTranslations(
      { noteSlugs: ["bergamot"], accordSlugs: ["citrus"] },
      translations,
    );
    expect(report.unusedNotes).toEqual(["vanilla"]);
    expect(report.unusedAccords).toEqual([]);
  });

  it("returns empty arrays when everything matches exactly", () => {
    const report = findMissingTranslations(
      { noteSlugs: ["bergamot", "vanilla"], accordSlugs: ["citrus"] },
      translations,
    );
    expect(report).toEqual({
      missingNotes: [],
      missingAccords: [],
      unusedNotes: [],
      unusedAccords: [],
    });
  });

  it("sorts results", () => {
    const report = findMissingTranslations(
      { noteSlugs: ["zzz-note", "aaa-note"], accordSlugs: [] },
      { notes: new Map(), accords: new Map() },
    );
    expect(report.missingNotes).toEqual(["aaa-note", "zzz-note"]);
  });
});
