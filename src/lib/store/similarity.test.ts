import { describe, expect, it } from "vitest";
import {
  isGenderCompatible,
  rankSimilarProducts,
  scoreSimilarity,
  type SimilarityCandidate,
} from "./similarity";

const EMPTY_PROFILE = {
  seasonSpring: null,
  seasonSummer: null,
  seasonFall: null,
  seasonWinter: null,
  daypartDay: null,
  daypartNight: null,
};

function candidate(
  overrides: Partial<SimilarityCandidate> & { id: string },
): SimilarityCandidate {
  return {
    gender: null,
    accords: [],
    notes: [],
    profile: EMPTY_PROFILE,
    collection: null,
    perfumerIds: [],
    isFeatured: false,
    createdAt: 0,
    ...overrides,
  };
}

describe("isGenderCompatible", () => {
  it("excludes MEN from WOMEN in both directions", () => {
    expect(isGenderCompatible("MEN", "WOMEN")).toBe(false);
    expect(isGenderCompatible("WOMEN", "MEN")).toBe(false);
  });

  it("lets UNISEX and null match everything, including each other", () => {
    expect(isGenderCompatible("UNISEX", "MEN")).toBe(true);
    expect(isGenderCompatible("UNISEX", "WOMEN")).toBe(true);
    expect(isGenderCompatible(null, "MEN")).toBe(true);
    expect(isGenderCompatible(null, "WOMEN")).toBe(true);
    expect(isGenderCompatible(null, "UNISEX")).toBe(true);
    expect(isGenderCompatible(null, null)).toBe(true);
    expect(isGenderCompatible("UNISEX", "UNISEX")).toBe(true);
  });
});

describe("scoreSimilarity", () => {
  it("scores 0 for MEN against WOMEN even with identical accords", () => {
    const a = candidate({
      id: "a",
      gender: "MEN",
      accords: [{ accordId: "woody", strength: 100 }],
    });
    const b = candidate({
      id: "b",
      gender: "WOMEN",
      accords: [{ accordId: "woody", strength: 100 }],
    });
    expect(scoreSimilarity(a, b)).toBe(0);
    expect(scoreSimilarity(b, a)).toBe(0);
  });

  it("excludes the product itself", () => {
    const a = candidate({
      id: "a",
      accords: [{ accordId: "woody", strength: 100 }],
    });
    expect(scoreSimilarity(a, a)).toBe(0);
  });

  it("renormalizes weights when a component is missing on either side", () => {
    // Neither product has accords or a profile, only notes, so the note
    // weight (0.30) must be scaled up to 1 and the score must equal the
    // note-family cosine similarity exactly, not 0.30 of it.
    const a = candidate({
      id: "a",
      notes: [{ family: "citrus", weight: 80 }],
    });
    const b = candidate({
      id: "b",
      notes: [{ family: "citrus", weight: 80 }],
    });
    expect(scoreSimilarity(a, b)).toBe(1);
  });

  it("treats all-zero note weights as family presence", () => {
    // Without the presence rule this would be a zero-magnitude vector and
    // cosine similarity would return 0 instead of a perfect match.
    const a = candidate({
      id: "a",
      notes: [
        { family: "citrus", weight: 0 },
        { family: "woody", weight: 0 },
      ],
    });
    const b = candidate({
      id: "b",
      notes: [
        { family: "citrus", weight: 0 },
        { family: "woody", weight: 0 },
      ],
    });
    expect(scoreSimilarity(a, b)).toBeCloseTo(1);
  });

  it("weighs an accords-only match higher than a notes-only match", () => {
    const base = candidate({
      id: "base",
      accords: [{ accordId: "woody", strength: 100 }],
      notes: [{ family: "citrus", weight: 100 }],
    });
    // Matches base's accords exactly, but shares no note family with it.
    const accordTwin = candidate({
      id: "accord-twin",
      accords: [{ accordId: "woody", strength: 100 }],
      notes: [{ family: "gourmand", weight: 100 }],
    });
    // Matches base's notes exactly, but shares no accord with it.
    const noteTwin = candidate({
      id: "note-twin",
      accords: [{ accordId: "aquatic", strength: 100 }],
      notes: [{ family: "citrus", weight: 100 }],
    });

    const accordTwinScore = scoreSimilarity(base, accordTwin);
    const noteTwinScore = scoreSimilarity(base, noteTwin);
    expect(accordTwinScore).toBeGreaterThan(noteTwinScore);
  });

  it("only compares shared, non-null profile dimensions", () => {
    const a = candidate({
      id: "a",
      profile: { ...EMPTY_PROFILE, seasonSpring: 80, seasonSummer: 20 },
    });
    const b = candidate({
      id: "b",
      // daypartDay is only set on b, so it is excluded from the comparison
      // instead of being treated as 0.
      profile: { ...EMPTY_PROFILE, seasonSpring: 80, daypartDay: 60 },
    });
    // Only seasonSpring is shared, so cosine similarity of [80] vs [80] is 1.
    expect(scoreSimilarity(a, b)).toBe(1);
  });

  it("drops the profile component when neither side shares a dimension", () => {
    const a = candidate({
      id: "a",
      accords: [{ accordId: "woody", strength: 100 }],
      profile: { ...EMPTY_PROFILE, seasonSpring: 80 },
    });
    const b = candidate({
      id: "b",
      accords: [{ accordId: "woody", strength: 100 }],
      profile: { ...EMPTY_PROFILE, daypartNight: 80 },
    });
    // The profile component is missing (no shared dimension), so the score
    // reduces to the accord cosine similarity alone: a perfect match.
    expect(scoreSimilarity(a, b)).toBe(1);
  });

  it("adds the bonus for a shared collection even with no other data", () => {
    const a = candidate({ id: "a", collection: "Été 2024" });
    const b = candidate({ id: "b", collection: "ÉTÉ 2024  " });
    expect(scoreSimilarity(a, b)).toBeCloseTo(0.05);
  });

  it("adds the bonus for a shared perfumer even with no other data", () => {
    const a = candidate({ id: "a", perfumerIds: ["p1", "p2"] });
    const b = candidate({ id: "b", perfumerIds: ["p2", "p3"] });
    expect(scoreSimilarity(a, b)).toBeCloseTo(0.05);
  });

  it("does not add the bonus for different collections and no shared perfumer", () => {
    const a = candidate({
      id: "a",
      collection: "Été 2024",
      perfumerIds: ["p1"],
    });
    const b = candidate({
      id: "b",
      collection: "Invierno 2024",
      perfumerIds: ["p2"],
    });
    expect(scoreSimilarity(a, b)).toBe(0);
  });

  it("clamps the total score to 1 when a perfect match also earns the bonus", () => {
    const a = candidate({
      id: "a",
      accords: [{ accordId: "woody", strength: 100 }],
      notes: [{ family: "citrus", weight: 100 }],
      profile: { ...EMPTY_PROFILE, seasonSpring: 80 },
      collection: "Été 2024",
    });
    const b = candidate({
      id: "b",
      accords: [{ accordId: "woody", strength: 100 }],
      notes: [{ family: "citrus", weight: 100 }],
      profile: { ...EMPTY_PROFILE, seasonSpring: 80 },
      collection: "été 2024",
    });
    expect(scoreSimilarity(a, b)).toBe(1);
  });
});

describe("rankSimilarProducts", () => {
  it("excludes the product itself from its own ranking", () => {
    const candidates = [
      candidate({ id: "a", accords: [{ accordId: "woody", strength: 100 }] }),
    ];
    expect(rankSimilarProducts(candidates)).toEqual({ a: [] });
  });

  it("breaks ties by isFeatured desc, then createdAt desc", () => {
    const target = candidate({
      id: "target",
      accords: [{ accordId: "woody", strength: 100 }],
    });
    // All three share the same accord vector as target, so they tie on score.
    const oldFeatured = candidate({
      id: "old-featured",
      accords: [{ accordId: "woody", strength: 100 }],
      isFeatured: true,
      createdAt: 1,
    });
    const newPlain = candidate({
      id: "new-plain",
      accords: [{ accordId: "woody", strength: 100 }],
      isFeatured: false,
      createdAt: 100,
    });
    const oldPlain = candidate({
      id: "old-plain",
      accords: [{ accordId: "woody", strength: 100 }],
      isFeatured: false,
      createdAt: 1,
    });

    const ranked = rankSimilarProducts([
      target,
      newPlain,
      oldPlain,
      oldFeatured,
    ]);
    expect(ranked.target).toEqual(["old-featured", "new-plain", "old-plain"]);
  });

  it("caps the ranking at the top 20 matches", () => {
    const target = candidate({
      id: "target",
      accords: [{ accordId: "woody", strength: 100 }],
    });
    const others = Array.from({ length: 25 }, (_, index) =>
      candidate({
        id: `other-${index}`,
        accords: [{ accordId: "woody", strength: 100 }],
        createdAt: index,
      }),
    );

    const ranked = rankSimilarProducts([target, ...others]);
    expect(ranked.target).toHaveLength(20);
    // Newest createdAt values win the tiebreak, so the cap keeps others-24..5.
    expect(ranked.target[0]).toBe("other-24");
    expect(ranked.target[19]).toBe("other-5");
  });

  it("omits products with a score of 0, such as gender-incompatible ones", () => {
    const men = candidate({
      id: "men",
      gender: "MEN",
      accords: [{ accordId: "woody", strength: 100 }],
    });
    const women = candidate({
      id: "women",
      gender: "WOMEN",
      accords: [{ accordId: "woody", strength: 100 }],
    });
    const ranked = rankSimilarProducts([men, women]);
    expect(ranked.men).toEqual([]);
    expect(ranked.women).toEqual([]);
  });
});
