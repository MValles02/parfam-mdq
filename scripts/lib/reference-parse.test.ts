/**
 * Coverage for the pure new-database/perfumes.jsonl record parser.
 *   pnpm test -- scripts/lib/reference-parse.test.ts
 *
 * Fixtures below are hand-written JSON, not read from new-database/ (that
 * directory is gitignored and local-only; the parser must not depend on it
 * to be testable).
 */
import { describe, expect, it } from "vitest";
import {
  brandSlugFromRecordSlug,
  mapGender,
  parseReferenceRecord,
  toNoteSlug,
  toSlug,
} from "./reference-parse";

/** Minimal valid raw record, overridable per test so each case stays short. */
function baseRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    slug: "Azzaro/Orange-Tonic",
    name: "Orange Tonic",
    brand: "Azzaro",
    year: 2003,
    gender: "female",
    collection: null,
    description: "Orange Tonic by Azzaro is a Floral Green fragrance.",
    perfumers: [{ name: "Nathalie Feisthauer", slug: "Nathalie_Feisthauer" }],
    accords: [
      { name: "citrus", strength: 100 },
      { name: "green", strength: 41 },
    ],
    notes: { tiered: { top: [], middle: [], base: [] }, flat: [] },
    longevity: { average: 2.8696 },
    sillage: { average: 2.4444 },
    seasons: { winter: 7, spring: 17, summer: 33, autumn: 12 },
    daypart: { day: 46, night: 5 },
    people: 97,
    popularity: { magnitude: 119527 },
    meta: { scraped_at: 1779692833 },
    // Fields the parser drops entirely; present to prove they are ignored.
    url: "https://www.fragrantica.com/perfume/Azzaro/Orange-Tonic-1.html",
    rating: { average: 3.47, histogram: [] },
    ...overrides,
  };
}

describe("toSlug / toNoteSlug / brandSlugFromRecordSlug", () => {
  it("slugifies with lower + strict + trim", () => {
    expect(toSlug("Green Notes")).toBe("green-notes");
  });

  it("derives a note slug from a trimmed, lowercased display name", () => {
    expect(toNoteSlug("  Calabrian Bergamot  ")).toBe("calabrian-bergamot");
  });

  it("extracts the brand slug from a record slug with accents and punctuation", () => {
    expect(brandSlugFromRecordSlug("L'Étoile & Co./Signature-Extrait")).toBe(
      "letoile-and-co",
    );
    expect(brandSlugFromRecordSlug("Björn-Borg/Signature")).toBe("bjorn-borg");
  });
});

describe("mapGender", () => {
  it("maps the three known dataset values", () => {
    expect(mapGender("male")).toBe("MEN");
    expect(mapGender("female")).toBe("WOMEN");
    expect(mapGender("unisex")).toBe("UNISEX");
  });

  it("maps anything else, including null, to null", () => {
    expect(mapGender("nonbinary")).toBeNull();
    expect(mapGender(null)).toBeNull();
    expect(mapGender(undefined)).toBeNull();
  });
});

describe("parseReferenceRecord — tiered record", () => {
  it("parses tiers, accords, and perfumers, deduplicating within scope", () => {
    const record = baseRecord({
      perfumers: [
        { name: "Nathalie Feisthauer", slug: "Nathalie_Feisthauer" },
        { name: "Nathalie Feisthauer", slug: "Nathalie_Feisthauer" }, // duplicate slug, dropped
      ],
      accords: [
        { name: "citrus", strength: 100 },
        { name: "Citrus", strength: 50 }, // same slug as above, dropped
        { name: "green", strength: 41 },
      ],
      notes: {
        tiered: {
          top: [
            { name: "Orange", slug: "Orange", weight: 100 },
            { name: "orange", slug: "Orange", weight: 10 }, // same noteSlug in same tier, dropped
            { name: "Bergamot", slug: "Bergamot", weight: 28 },
          ],
          middle: [{ name: "Honeysuckle", slug: "Honeysuckle", weight: 30 }],
          base: [{ name: "Musk", slug: "Musk", weight: 10 }],
        },
        flat: [],
      },
    });

    const parsed = parseReferenceRecord(record);

    expect(parsed.pid).toBe(1);
    expect(parsed.recordSlug).toBe("Azzaro/Orange-Tonic");
    expect(parsed.brandSlug).toBe("azzaro");
    expect(parsed.gender).toBe("WOMEN");

    expect(parsed.perfumers).toEqual([
      { name: "Nathalie Feisthauer", slug: "nathalie-feisthauer" },
    ]);

    expect(parsed.accords).toEqual([
      { name: "citrus", slug: "citrus", strength: 100, sortOrder: 0 },
      { name: "green", slug: "green", strength: 41, sortOrder: 2 },
    ]);

    expect(parsed.notes).toEqual([
      {
        name: "Orange",
        noteSlug: "orange",
        family: "Orange",
        position: "TOP",
        weight: 100,
        sortOrder: 0,
      },
      {
        name: "Bergamot",
        noteSlug: "bergamot",
        family: "Bergamot",
        position: "TOP",
        weight: 28,
        sortOrder: 2,
      },
      {
        name: "Honeysuckle",
        noteSlug: "honeysuckle",
        family: "Honeysuckle",
        position: "MIDDLE",
        weight: 30,
        sortOrder: 0,
      },
      {
        name: "Musk",
        noteSlug: "musk",
        family: "Musk",
        position: "BASE",
        weight: 10,
        sortOrder: 0,
      },
    ]);
  });
});

describe("parseReferenceRecord — flat record", () => {
  it("parses flat notes with position null", () => {
    const record = baseRecord({
      notes: {
        tiered: { top: [], middle: [], base: [] },
        flat: [
          { name: "Lemon", slug: "Lemon", weight: 80 },
          { name: "Vanilla", slug: "Vanilla", weight: 20 },
        ],
      },
    });

    const parsed = parseReferenceRecord(record);

    expect(parsed.notes).toEqual([
      {
        name: "Lemon",
        noteSlug: "lemon",
        family: "Lemon",
        position: null,
        weight: 80,
        sortOrder: 0,
      },
      {
        name: "Vanilla",
        noteSlug: "vanilla",
        family: "Vanilla",
        position: null,
        weight: 20,
        sortOrder: 1,
      },
    ]);
  });
});

describe("parseReferenceRecord — no notes", () => {
  it("returns an empty notes array when both tiered and flat are empty", () => {
    const record = baseRecord({
      notes: { tiered: { top: [], middle: [], base: [] }, flat: [] },
    });
    expect(parseReferenceRecord(record).notes).toEqual([]);
  });
});

describe("parseReferenceRecord — null vote aggregates", () => {
  it("keeps every vote aggregate null when the source blob is absent", () => {
    const record = baseRecord({
      longevity: null,
      sillage: null,
      seasons: null,
      daypart: null,
      people: null,
      popularity: null,
    });

    const parsed = parseReferenceRecord(record);
    expect(parsed.longevity).toBeNull();
    expect(parsed.sillage).toBeNull();
    expect(parsed.seasonVotes).toBeNull();
    expect(parsed.daypartVotes).toBeNull();
    expect(parsed.communityVotes).toBeNull();
    expect(parsed.popularity).toBeNull();
  });
});

describe("parseReferenceRecord — all-zero weights preserved", () => {
  it("keeps notes at weight 0 rather than treating them as missing", () => {
    const record = baseRecord({
      notes: {
        tiered: {
          top: [{ name: "Orange", slug: "Orange", weight: 0 }],
          middle: [],
          base: [],
        },
        flat: [],
      },
    });

    const parsed = parseReferenceRecord(record);
    expect(parsed.notes).toEqual([
      {
        name: "Orange",
        noteSlug: "orange",
        family: "Orange",
        position: "TOP",
        weight: 0,
        sortOrder: 0,
      },
    ]);
  });
});

describe("parseReferenceRecord — shared family, distinct display names", () => {
  it("keeps two display names that share a family slug as separate notes", () => {
    const record = baseRecord({
      notes: {
        tiered: { top: [], middle: [], base: [] },
        flat: [
          { name: "Calabrian bergamot", slug: "Bergamot", weight: 60 },
          { name: "Sicilian Bergamot", slug: "Bergamot", weight: 40 },
        ],
      },
    });

    const parsed = parseReferenceRecord(record);
    expect(parsed.notes).toHaveLength(2);
    expect(parsed.notes.map((n) => n.noteSlug)).toEqual([
      "calabrian-bergamot",
      "sicilian-bergamot",
    ]);
    expect(parsed.notes.every((n) => n.family === "Bergamot")).toBe(true);
  });
});

describe("parseReferenceRecord — scrapedAt conversion", () => {
  it("converts unix seconds to a Date", () => {
    const parsed = parseReferenceRecord(
      baseRecord({ meta: { scraped_at: 1779692833 } }),
    );
    expect(parsed.scrapedAt).toEqual(new Date(1779692833 * 1000));
  });

  it("is null when scraped_at is absent", () => {
    const parsed = parseReferenceRecord(baseRecord({ meta: {} }));
    expect(parsed.scrapedAt).toBeNull();
  });
});

describe("parseReferenceRecord — zero averages and zero-sum votes mean no community votes", () => {
  it("normalizes a 0 longevity/sillage average to null", () => {
    const record = baseRecord({
      longevity: { average: 0 },
      sillage: { average: 0 },
    });
    const parsed = parseReferenceRecord(record);
    expect(parsed.longevity).toBeNull();
    expect(parsed.sillage).toBeNull();
  });

  it("normalizes an all-zero seasons/daypart tally to null", () => {
    const record = baseRecord({
      seasons: { winter: 0, spring: 0, summer: 0, autumn: 0 },
      daypart: { day: 0, night: 0 },
    });
    const parsed = parseReferenceRecord(record);
    expect(parsed.seasonVotes).toBeNull();
    expect(parsed.daypartVotes).toBeNull();
  });

  it("keeps valid longevity/sillage averages, vote tallies, and community votes", () => {
    const record = baseRecord({
      longevity: { average: 2.8696 },
      sillage: { average: 2.4444 },
      seasons: { winter: 7, spring: 17, summer: 33, autumn: 12 },
      daypart: { day: 46, night: 5 },
      people: 97,
    });
    const parsed = parseReferenceRecord(record);
    expect(parsed.longevity).toBe(2.8696);
    expect(parsed.sillage).toBe(2.4444);
    expect(parsed.seasonVotes).toEqual({
      winter: 7,
      spring: 17,
      summer: 33,
      autumn: 12,
    });
    expect(parsed.daypartVotes).toEqual({ day: 46, night: 5 });
    expect(parsed.communityVotes).toBe(97);
  });
});

describe("parseReferenceRecord — throwing cases", () => {
  it("throws when longevity average is outside the valid [1, 5] range", () => {
    expect(() =>
      parseReferenceRecord(baseRecord({ longevity: { average: 5.5 } })),
    ).toThrow(/longevity average/);
  });

  it("throws when sillage average is outside the valid [1, 4] range", () => {
    expect(() =>
      parseReferenceRecord(baseRecord({ sillage: { average: 0.5 } })),
    ).toThrow(/sillage average/);
  });

  it("throws when a season vote count is negative", () => {
    const record = baseRecord({
      seasons: { winter: -1, spring: 17, summer: 33, autumn: 12 },
    });
    expect(() => parseReferenceRecord(record)).toThrow(/seasons.winter/);
  });

  it("throws when a record has both non-empty tiered and non-empty flat notes", () => {
    const record = baseRecord({
      notes: {
        tiered: {
          top: [{ name: "Orange", slug: "Orange", weight: 50 }],
          middle: [],
          base: [],
        },
        flat: [{ name: "Lemon", slug: "Lemon", weight: 50 }],
      },
    });
    expect(() => parseReferenceRecord(record)).toThrow(/tiered and flat/);
  });

  it("throws when id is not a positive integer", () => {
    expect(() => parseReferenceRecord(baseRecord({ id: 0 }))).toThrow(
      /positive integer/,
    );
    expect(() => parseReferenceRecord(baseRecord({ id: -3 }))).toThrow(
      /positive integer/,
    );
    expect(() => parseReferenceRecord(baseRecord({ id: 1.5 }))).toThrow(
      /positive integer/,
    );
  });

  it("throws when a note weight is outside 0..100", () => {
    const record = baseRecord({
      notes: {
        tiered: {
          top: [{ name: "Orange", slug: "Orange", weight: 101 }],
          middle: [],
          base: [],
        },
        flat: [],
      },
    });
    expect(() => parseReferenceRecord(record)).toThrow(/weight/);
  });

  it("throws when an accord strength is outside 0..100", () => {
    const record = baseRecord({
      accords: [{ name: "citrus", strength: -1 }],
    });
    expect(() => parseReferenceRecord(record)).toThrow(/strength/);
  });

  it("throws a schema validation error when a required field is missing or mistyped", () => {
    const record = baseRecord({ id: "not-a-number" });
    expect(() => parseReferenceRecord(record)).toThrow(
      /failed schema validation/,
    );
  });

  it("throws when year is not an integer", () => {
    expect(() => parseReferenceRecord(baseRecord({ year: 2003.5 }))).toThrow(
      /year must be an integer/,
    );
  });

  it("throws when popularity.magnitude is negative", () => {
    expect(() =>
      parseReferenceRecord(baseRecord({ popularity: { magnitude: -1 } })),
    ).toThrow(/popularity\.magnitude must be a non-negative integer/);
  });

  it("throws when popularity.magnitude is not an integer", () => {
    expect(() =>
      parseReferenceRecord(baseRecord({ popularity: { magnitude: 119527.5 } })),
    ).toThrow(/popularity\.magnitude must be a non-negative integer/);
  });
});

describe("parseReferenceRecord — year and popularity bounds", () => {
  it("accepts year 1500 and current year + 1 as valid boundaries", () => {
    const nextYear = new Date().getFullYear() + 1;
    expect(parseReferenceRecord(baseRecord({ year: 1500 })).year).toBe(1500);
    expect(parseReferenceRecord(baseRecord({ year: nextYear })).year).toBe(
      nextYear,
    );
  });

  it("keeps year and popularity null when the source fields are null", () => {
    const record = baseRecord({ year: null, popularity: null });
    const parsed = parseReferenceRecord(record);
    expect(parsed.year).toBeNull();
    expect(parsed.popularity).toBeNull();
  });

  it("keeps a valid popularity magnitude as-is", () => {
    const parsed = parseReferenceRecord(
      baseRecord({ popularity: { magnitude: 119527 } }),
    );
    expect(parsed.popularity).toBe(119527);
  });

  it("has no warnings for a record within every valid range", () => {
    const parsed = parseReferenceRecord(baseRecord());
    expect(parsed.warnings).toEqual([]);
  });

  it("normalizes a year below 1500 to null with a warning instead of throwing", () => {
    const parsed = parseReferenceRecord(baseRecord({ year: 1499 }));
    expect(parsed.year).toBeNull();
    expect(parsed.warnings).toHaveLength(1);
    expect(parsed.warnings?.[0]).toMatch(
      /year 1499 is outside the plausible range/,
    );
  });

  it("normalizes a year more than one year in the future to null with a warning instead of throwing", () => {
    const tooFarFuture = new Date().getFullYear() + 2;
    const parsed = parseReferenceRecord(baseRecord({ year: tooFarFuture }));
    expect(parsed.year).toBeNull();
    expect(parsed.warnings).toHaveLength(1);
  });

  it("still throws when year is not an integer, even though out-of-range years no longer throw", () => {
    expect(() => parseReferenceRecord(baseRecord({ year: 2003.5 }))).toThrow(
      /year must be an integer/,
    );
  });

  it("matches the two known corrupt real-dataset records (pid 104363 year 20, pid 92094 year 1070)", () => {
    const shortYear = parseReferenceRecord(
      baseRecord({ id: 104363, year: 20 }),
    );
    expect(shortYear.year).toBeNull();
    expect(shortYear.warnings).toHaveLength(1);

    const earlyYear = parseReferenceRecord(
      baseRecord({ id: 92094, year: 1070 }),
    );
    expect(earlyYear.year).toBeNull();
    expect(earlyYear.warnings).toHaveLength(1);
  });
});

describe("parseReferenceRecord — perfumer slug comes from the dataset slug", () => {
  it("derives the perfumer slug from the dataset's own slug, replacing underscores with word boundaries", () => {
    const record = baseRecord({
      perfumers: [{ name: "Nathalie Feisthauer", slug: "Nathalie_Feisthauer" }],
    });
    const parsed = parseReferenceRecord(record);
    expect(parsed.perfumers).toEqual([
      { name: "Nathalie Feisthauer", slug: "nathalie-feisthauer" },
    ]);
  });

  it("percent-decodes the dataset slug before slugifying", () => {
    const record = baseRecord({
      perfumers: [{ name: "Sophie Labbé", slug: "Sophie_Labb%C3%A9" }],
    });
    const parsed = parseReferenceRecord(record);
    expect(parsed.perfumers).toEqual([
      { name: "Sophie Labbé", slug: "sophie-labbe" },
    ]);
  });

  it("does not throw on a malformed percent-escape in the dataset slug", () => {
    const record = baseRecord({
      perfumers: [{ name: "Bad Name", slug: "Bad%ZZ_Name" }],
    });
    expect(() => parseReferenceRecord(record)).not.toThrow();
    const parsed = parseReferenceRecord(record);
    expect(parsed.perfumers).toHaveLength(1);
    expect(parsed.perfumers[0].slug).not.toBe("");
  });

  it("falls back to toSlug(name) when the dataset slug is empty", () => {
    const record = baseRecord({
      perfumers: [{ name: "Nathalie Feisthauer", slug: "" }],
    });
    const parsed = parseReferenceRecord(record);
    expect(parsed.perfumers).toEqual([
      { name: "Nathalie Feisthauer", slug: "nathalie-feisthauer" },
    ]);
  });

  it("deduplicates perfumer credits by the dataset-slug-derived slug", () => {
    const record = baseRecord({
      perfumers: [
        { name: "Nathalie Feisthauer", slug: "Nathalie_Feisthauer" },
        { name: "NATHALIE FEISTHAUER", slug: "Nathalie_Feisthauer" },
      ],
    });
    const parsed = parseReferenceRecord(record);
    expect(parsed.perfumers).toHaveLength(1);
  });
});
