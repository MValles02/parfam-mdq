import { describe, expect, it } from "vitest";
import { catalogHref, isCatalogView, type CatalogFilters } from "./filters";

const defaults: CatalogFilters = {
  search: "",
  gender: null,
  variantKind: null,
  brand: null,
  accord: null,
  note: null,
  priceRange: null,
  sort: "featured",
  page: 1,
};

describe("isCatalogView", () => {
  it("is false for default filters", () => {
    expect(isCatalogView(defaults)).toBe(false);
  });

  it.each([
    { search: "oud" },
    { gender: "MEN" },
    { variantKind: "DECANT" },
    { brand: "x" },
    { accord: "x" },
    { note: "x" },
    { priceRange: "under100000" },
    { page: 2 },
    { sort: "latest" },
  ] as Partial<CatalogFilters>[])("is true for %o", (override) => {
    expect(isCatalogView({ ...defaults, ...override })).toBe(true);
  });
});

describe("catalogHref", () => {
  it("serializes filters with the catalog anchor", () => {
    expect(catalogHref({ gender: "MEN" })).toBe("/?genero=MEN#catalogo");
  });
});
