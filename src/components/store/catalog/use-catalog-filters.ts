import { useQueryStates } from "nuqs";
import {
  catalogFilterParsers,
  catalogFilterQueryOptions,
} from "@/lib/store/filters";

/**
 * Catalog filter state read from and written to the URL, with the same
 * parsers and options the server uses to load it.
 */
export function useCatalogFilters() {
  return useQueryStates(catalogFilterParsers, catalogFilterQueryOptions);
}
