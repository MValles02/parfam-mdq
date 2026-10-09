import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server";

/** URL values for the `estado` tab; they match `ProductStatusFilter`. */
export const PRODUCT_ESTADO_VALUES = [
  "todos",
  "publicados",
  "borradores",
] as const;

export const productListParsers = {
  q: parseAsString.withDefault(""),
  estado: parseAsStringLiteral(PRODUCT_ESTADO_VALUES).withDefault("todos"),
};

export const loadProductListParams = createLoader(productListParsers);
