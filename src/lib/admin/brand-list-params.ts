import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server";

export const BRAND_FILTRO_VALUES = ["todas", "sin-corregir"] as const;

export const brandListParsers = {
  q: parseAsString.withDefault(""),
  filtro: parseAsStringLiteral(BRAND_FILTRO_VALUES).withDefault("todas"),
};

export const loadBrandListParams = createLoader(brandListParsers);
