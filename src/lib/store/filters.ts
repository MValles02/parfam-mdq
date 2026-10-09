import {
  createLoader,
  createParser,
  createSerializer,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  type UrlKeys,
} from "nuqs/server";
import type { Gender, VariantKind } from "@/generated/prisma/enums";

/**
 * Catalog filters live in the URL. The parser definitions are shared by the
 * Server Components and client controls, so both ends apply the same defaults.
 * The URL keys and values are a public, Spanish-language contract; the model
 * exposed to the application uses English names.
 */
export const GENDERS = ["WOMEN", "MEN", "UNISEX"] as const satisfies Gender[];

export const VARIANT_KINDS = [
  "FULL_BOTTLE",
  "DECANT",
] as const satisfies VariantKind[];

export const SORT_OPTIONS = [
  "featured",
  "latest",
  "priceAscending",
  "priceDescending",
  "name",
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  featured: "Destacados",
  priceAscending: "Menor precio",
  priceDescending: "Mayor precio",
  latest: "Más nuevos",
  name: "Nombre (A-Z)",
};

/**
 * Closed price bands keep the catalog URL readable and prevent arbitrary range
 * input. A product belongs to a band when at least one active variant falls
 * within its bounds.
 */
export const PRICE_RANGES = [
  "under100000",
  "100000To300000",
  "300000To600000",
  "over600000",
] as const;

export type PriceRange = (typeof PRICE_RANGES)[number];

export const PRICE_RANGE_LIMITS: Record<
  PriceRange,
  { min?: number; max?: number }
> = {
  under100000: { max: 100000 },
  "100000To300000": { min: 100000, max: 300000 },
  "300000To600000": { min: 300000, max: 600000 },
  over600000: { min: 600000 },
};

export const PRICE_RANGE_LABELS: Record<PriceRange, string> = {
  under100000: "Hasta $ 100.000",
  "100000To300000": "$ 100.000 a $ 300.000",
  "300000To600000": "$ 300.000 a $ 600.000",
  over600000: "Más de $ 600.000",
};

/**
 * This adapter preserves the established Spanish URL values while keeping
 * those transport details out of the internal catalog-filter model.
 */
const sortUrlValues = {
  destacados: "featured",
  novedades: "latest",
  "precio-asc": "priceAscending",
  "precio-desc": "priceDescending",
  nombre: "name",
} as const satisfies Record<string, SortOption>;

const priceRangeUrlValues = {
  "hasta-100000": "under100000",
  "100000-300000": "100000To300000",
  "300000-600000": "300000To600000",
  "desde-600000": "over600000",
} as const satisfies Record<string, PriceRange>;

function createUrlValueParser<T extends string>(urlValues: Record<string, T>) {
  const internalValues = Object.entries(urlValues).map(([urlValue, value]) => [
    value,
    urlValue,
  ]);

  return createParser({
    parse: (urlValue) => urlValues[urlValue] ?? null,
    serialize: (value) =>
      internalValues.find(([internalValue]) => internalValue === value)?.[1] ??
      "",
  });
}

const sortParser = createUrlValueParser(sortUrlValues).withDefault("featured");
const priceRangeParser = createUrlValueParser(priceRangeUrlValues);

export const catalogFilterParsers = {
  search: parseAsString.withDefault(""),
  gender: parseAsStringLiteral(GENDERS),
  variantKind: parseAsStringLiteral(VARIANT_KINDS),
  brand: parseAsString,
  accord: parseAsString,
  note: parseAsString,
  priceRange: priceRangeParser,
  sort: sortParser,
  page: parseAsInteger.withDefault(1),
};

/** Raw Spanish keys kept for existing shared catalog URLs. */
export const catalogFilterUrlKeys: UrlKeys<typeof catalogFilterParsers> = {
  search: "q",
  gender: "genero",
  variantKind: "presentacion",
  brand: "marca",
  accord: "acorde",
  note: "nota",
  priceRange: "precio",
  sort: "orden",
  page: "pagina",
};

/**
 * Changing a filter must request a new server-rendered grid. Default values
 * are removed so clearing filters returns to a compact, shareable URL.
 * `scroll` is on because applying a filter collapses the home view into the
 * catalog view, where the catalog starts at the top of the page.
 */
export const catalogFilterQueryOptions = {
  shallow: false,
  clearOnDefault: true,
  scroll: true,
  urlKeys: catalogFilterUrlKeys,
} as const;

export const loadCatalogFilters = createLoader(catalogFilterParsers, {
  urlKeys: catalogFilterUrlKeys,
});

export const serializeCatalogFilters = createSerializer(catalogFilterParsers, {
  clearOnDefault: true,
  urlKeys: catalogFilterUrlKeys,
});

export type CatalogFilters = {
  search: string;
  gender: Gender | null;
  variantKind: (typeof VARIANT_KINDS)[number] | null;
  brand: string | null;
  accord: string | null;
  note: string | null;
  priceRange: PriceRange | null;
  sort: SortOption;
  page: number;
};

/** Counts applied filters for the mobile button. */
export function countActiveCatalogFilters(filters: CatalogFilters): number {
  return [
    filters.search.trim() || null,
    filters.gender,
    filters.variantKind,
    filters.brand,
    filters.accord,
    filters.note,
    filters.priceRange,
  ].filter(Boolean).length;
}

/**
 * The home page shows the hero above the catalog only while no filter, page or
 * non-default sort is applied; otherwise it shows the catalog alone.
 */
export function isCatalogView(filters: CatalogFilters): boolean {
  return (
    countActiveCatalogFilters(filters) > 0 ||
    filters.page > 1 ||
    filters.sort !== "featured"
  );
}

/** Link to the home catalog with the given filters applied. */
export function catalogHref(partial: Partial<CatalogFilters>): string {
  return "/" + serializeCatalogFilters(partial) + "#catalogo";
}
