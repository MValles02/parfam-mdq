/**
 * Coverage for the pure dimension-aggregation and row-building helpers used
 * by scripts/import-references.ts.
 *   pnpm test -- scripts/lib/reference-import.test.ts
 */
import { describe, expect, it } from "vitest";
import type { ParsedReference } from "./reference-parse";
import {
  ReferenceDimensionAggregator,
  SlugFrequencyTracker,
  buildFragranceRefRow,
  buildSearchText,
} from "./reference-import";

/** Minimal valid ParsedReference, overridable per test so each case stays short. */
function baseRecord(overrides: Partial<ParsedReference> = {}): ParsedReference {
  return {
    pid: 1,
    recordSlug: "Azzaro/Orange-Tonic",
    name: "Orange Tonic",
    brandName: "Azzaro",
    brandSlug: "azzaro",
    year: 2003,
    gender: "WOMEN",
    collection: null,
    descriptionEn: null,
    perfumers: [{ name: "Nathalie Feisthauer", slug: "nathalie-feisthauer" }],
    accords: [{ name: "citrus", slug: "citrus", strength: 100, sortOrder: 0 }],
    notes: [
      {
        name: "Bergamot",
        noteSlug: "bergamot",
        family: "Bergamot",
        position: null,
        weight: 80,
        sortOrder: 0,
      },
    ],
    longevity: 2.87,
    sillage: 2.44,
    seasonVotes: { winter: 7, spring: 17, summer: 33, autumn: 12 },
    daypartVotes: { day: 46, night: 5 },
    communityVotes: 97,
    popularity: 119527,
    scrapedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("SlugFrequencyTracker", () => {
  it("picks the most frequently recorded value for a slug", () => {
    const tracker = new SlugFrequencyTracker();
    tracker.record("loreal", "L'OREAL");
    tracker.record("loreal", "L'Oréal");
    tracker.record("loreal", "L'Oréal");
    expect(tracker.mostFrequent("loreal")).toBe("L'Oréal");
    expect(tracker.total("loreal")).toBe(3);
  });

  it("keeps the first-recorded value on a tie", () => {
    const tracker = new SlugFrequencyTracker();
    tracker.record("dior", "Dior");
    tracker.record("dior", "DIOR");
    expect(tracker.mostFrequent("dior")).toBe("Dior");
  });

  it("throws for a slug it never saw", () => {
    const tracker = new SlugFrequencyTracker();
    expect(() => tracker.mostFrequent("missing")).toThrow(/was ever recorded/);
  });

  it("lists every recorded slug", () => {
    const tracker = new SlugFrequencyTracker();
    tracker.record("a", "A");
    tracker.record("b", "B");
    expect(tracker.slugs().sort()).toEqual(["a", "b"]);
  });
});

describe("ReferenceDimensionAggregator", () => {
  it("aggregates brands, perfumers, note slugs/families, and accord slugs across records", () => {
    const aggregator = new ReferenceDimensionAggregator();
    aggregator.add(baseRecord());
    aggregator.add(
      baseRecord({
        pid: 2,
        brandName: "AZZARO", // same brand, different casing; "Azzaro" stays the majority
        notes: [
          {
            name: "Calabrian Bergamot",
            noteSlug: "calabrian-bergamot",
            family: "Bergamot",
            position: null,
            weight: 60,
            sortOrder: 0,
          },
        ],
      }),
    );

    expect(aggregator.brands).toEqual([{ slug: "azzaro", name: "Azzaro" }]);
    expect(aggregator.perfumers).toEqual([
      { slug: "nathalie-feisthauer", name: "Nathalie Feisthauer" },
    ]);
    expect(aggregator.noteSlugs.sort()).toEqual([
      "bergamot",
      "calabrian-bergamot",
    ]);
    expect(aggregator.familyFor("bergamot")).toBe("Bergamot");
    expect(aggregator.familyFor("calabrian-bergamot")).toBe("Bergamot");
    expect(aggregator.accordSlugs).toEqual(["citrus"]);
  });

  it("picks the note's most frequent family across records that disagree", () => {
    const aggregator = new ReferenceDimensionAggregator();
    aggregator.add(
      baseRecord({
        notes: [
          {
            name: "Musk",
            noteSlug: "musk",
            family: "Musk",
            position: null,
            weight: 50,
            sortOrder: 0,
          },
        ],
      }),
    );
    aggregator.add(
      baseRecord({
        pid: 2,
        notes: [
          {
            name: "Musk",
            noteSlug: "musk",
            family: "Musk",
            position: null,
            weight: 40,
            sortOrder: 0,
          },
        ],
      }),
    );
    aggregator.add(
      baseRecord({
        pid: 3,
        notes: [
          {
            name: "Musk",
            noteSlug: "musk",
            family: "White Musk",
            position: null,
            weight: 40,
            sortOrder: 0,
          },
        ],
      }),
    );
    expect(aggregator.familyFor("musk")).toBe("Musk");
  });
});

describe("buildSearchText", () => {
  it("concatenates name and brand, leaving normalization to the database function", () => {
    expect(buildSearchText("Aventus", "Creed")).toBe("Aventus Creed");
  });
});

describe("buildFragranceRefRow", () => {
  it("maps a ParsedReference and resolved brandId to the shared row shape", () => {
    const row = buildFragranceRefRow(baseRecord(), "brand-id-123");
    expect(row).toEqual({
      pid: 1,
      slug: "Azzaro/Orange-Tonic",
      name: "Orange Tonic",
      brandId: "brand-id-123",
      year: 2003,
      gender: "WOMEN",
      collection: null,
      descriptionEn: null,
      longevity: 2.87,
      sillage: 2.44,
      seasonSpringVotes: 17,
      seasonSummerVotes: 33,
      seasonFallVotes: 12,
      seasonWinterVotes: 7,
      daypartDayVotes: 46,
      daypartNightVotes: 5,
      communityVotes: 97,
      popularity: 119527,
      scrapedAt: new Date("2026-01-01T00:00:00.000Z"),
      searchText: "Orange Tonic Azzaro",
    });
  });

  it("maps null season/daypart vote tallies to null-filled columns", () => {
    const row = buildFragranceRefRow(
      baseRecord({ seasonVotes: null, daypartVotes: null }),
      "brand-id-123",
    );
    expect(row.seasonSpringVotes).toBeNull();
    expect(row.seasonSummerVotes).toBeNull();
    expect(row.seasonFallVotes).toBeNull();
    expect(row.seasonWinterVotes).toBeNull();
    expect(row.daypartDayVotes).toBeNull();
    expect(row.daypartNightVotes).toBeNull();
  });
});
