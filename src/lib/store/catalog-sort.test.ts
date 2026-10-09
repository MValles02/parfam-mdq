import { describe, expect, it } from "vitest";
import { compareCatalogRows, type CatalogSortRow } from "./catalog-sort";

function row(
  overrides: Partial<CatalogSortRow> & { name: string },
): CatalogSortRow {
  return {
    startingPrice: null,
    isFeatured: false,
    createdAt: 0,
    ...overrides,
  };
}

describe("compareCatalogRows", () => {
  it("sorts by price ascending, with rows lacking a price last", () => {
    const rows = [
      row({ name: "C", startingPrice: "300" }),
      row({ name: "A", startingPrice: "100" }),
      row({ name: "B", startingPrice: null }),
    ];

    rows.sort((left, right) =>
      compareCatalogRows("priceAscending", left, right),
    );

    expect(rows.map((item) => item.name)).toEqual(["A", "C", "B"]);
  });

  it("sorts by price descending, with rows lacking a price still last", () => {
    const rows = [
      row({ name: "A", startingPrice: "100" }),
      row({ name: "B", startingPrice: null }),
      row({ name: "C", startingPrice: "300" }),
    ];

    rows.sort((left, right) =>
      compareCatalogRows("priceDescending", left, right),
    );

    expect(rows.map((item) => item.name)).toEqual(["C", "A", "B"]);
  });

  it("sorts by name using Spanish collation, accents sorting next to the base letter", () => {
    const rows = [row({ name: "Brisa" }), row({ name: "Ámbar" })];

    rows.sort((left, right) => compareCatalogRows("name", left, right));

    expect(rows.map((item) => item.name)).toEqual(["Ámbar", "Brisa"]);
  });

  it("defaults to featured first, then newest by createdAt", () => {
    const rows = [
      row({ name: "Old featured", isFeatured: true, createdAt: 1 }),
      row({ name: "New plain", isFeatured: false, createdAt: 3 }),
      row({ name: "Old plain", isFeatured: false, createdAt: 2 }),
      row({ name: "New featured", isFeatured: true, createdAt: 4 }),
    ];

    rows.sort((left, right) => compareCatalogRows("featured", left, right));

    expect(rows.map((item) => item.name)).toEqual([
      "New featured",
      "Old featured",
      "New plain",
      "Old plain",
    ]);
  });

  it("sorts latest by createdAt only, ignoring isFeatured", () => {
    const rows = [
      row({ name: "Old featured", isFeatured: true, createdAt: 1 }),
      row({ name: "New plain", isFeatured: false, createdAt: 3 }),
    ];

    rows.sort((left, right) => compareCatalogRows("latest", left, right));

    expect(rows.map((item) => item.name)).toEqual([
      "New plain",
      "Old featured",
    ]);
  });
});
