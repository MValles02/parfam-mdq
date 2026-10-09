import {
  createLoader,
  createSerializer,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

/** URL values for the `estado` tab; the page maps them to order statuses. */
export const ORDER_ESTADO_VALUES = [
  "todos",
  "pendientes",
  "confirmados",
  "entregados",
  "cancelados",
] as const;

export const orderListParsers = {
  q: parseAsString.withDefault(""),
  estado: parseAsStringLiteral(ORDER_ESTADO_VALUES).withDefault("todos"),
  pedido: parseAsString,
};

export const loadOrderListParams = createLoader(orderListParsers);

export const serializeOrderListParams = createSerializer(orderListParsers, {
  clearOnDefault: true,
});

export type OrderListFilters = {
  q: string;
  estado: (typeof ORDER_ESTADO_VALUES)[number];
};
