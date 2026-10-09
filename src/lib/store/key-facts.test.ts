import { describe, expect, it } from "vitest";
import { summarizeKeyFacts } from "./key-facts";

const empty = {
  longevity: null,
  sillage: null,
  seasons: { spring: null, summer: null, fall: null, winter: null },
  dayparts: { day: null, night: null },
};

describe("summarizeKeyFacts", () => {
  it("returns nulls when there is no data", () => {
    expect(summarizeKeyFacts(empty)).toEqual({
      duration: null,
      sillage: null,
      idealIn: null,
      moment: null,
    });
  });

  it("rounds and clamps longevity and sillage", () => {
    const facts = summarizeKeyFacts({ ...empty, longevity: 3.6, sillage: 9 });
    expect(facts.duration).toBe("Duradera");
    expect(facts.sillage).toBe("Enorme");
  });

  it("picks the two strongest seasons", () => {
    const facts = summarizeKeyFacts({
      ...empty,
      seasons: { spring: 10, summer: 5, fall: 80, winter: 60 },
    });
    expect(facts.idealIn).toBe("Otoño · Invierno");
  });

  it("picks day, night or both", () => {
    const moment = (day: number, night: number) =>
      summarizeKeyFacts({ ...empty, dayparts: { day, night } }).moment;
    expect(moment(70, 30)).toBe("Día");
    expect(moment(30, 70)).toBe("Noche");
    expect(moment(50, 50)).toBe("Día y noche");
  });
});
