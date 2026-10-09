import type { SortOption } from "@/lib/store/filters";

const SPANISH_COLLATOR = new Intl.Collator("es-AR", { sensitivity: "base" });

/** The fields `compareCatalogRows` needs; a light row carries nothing more. */
export type CatalogSortRow = {
  name: string;
  startingPrice: string | null;
  isFeatured: boolean;
  createdAt: number;
};

/**
 * Comparator for `listCatalog` (`src/lib/store/queries.ts`). Price sort
 * compares the minimum active variant price as a number (rows without an
 * active variant, `startingPrice === null`, sort last regardless of
 * direction); name sort uses Spanish collation so accented letters sort next
 * to their unaccented counterpart; `"latest"` is newest by `createdAt` only;
 * the default (`"featured"`) shows featured products first, then newest.
 */
export function compareCatalogRows(
  sort: SortOption,
  left: CatalogSortRow,
  right: CatalogSortRow,
): number {
  switch (sort) {
    case "priceAscending":
    case "priceDescending": {
      if (left.startingPrice === null) {
        return right.startingPrice === null ? 0 : 1;
      }
      if (right.startingPrice === null) return -1;

      const difference =
        Number(left.startingPrice) - Number(right.startingPrice);
      return sort === "priceAscending" ? difference : -difference;
    }
    case "name":
      return SPANISH_COLLATOR.compare(left.name, right.name);
    case "latest":
      return right.createdAt - left.createdAt;
    default:
      if (left.isFeatured !== right.isFeatured) {
        return left.isFeatured ? -1 : 1;
      }
      return right.createdAt - left.createdAt;
  }
}
