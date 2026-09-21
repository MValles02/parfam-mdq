import { cache } from "react";
import { ProductCard } from "@/components/store/product-card";
import { listCatalog } from "@/lib/store/queries";
import {
  countActiveCatalogFilters,
  type CatalogFilters,
} from "@/lib/store/filters";

/**
 * React cache deduplicates requests that use the same filters during a server
 * render, including the heading count, grid, and pagination.
 */
export const listCatalogCached = cache(listCatalog);

/**
 * The grid requests catalog results inside the section Suspense boundary.
 */
export async function CatalogGrid({
  filters,
  fixedBrand,
  headingLevel = "h2",
}: {
  filters: CatalogFilters;
  fixedBrand?: string;
  headingLevel?: "h2" | "h3";
}) {
  const { cards } = await listCatalogCached(filters);

  if (cards.length === 0) {
    // The route-owned brand is not user-selected, so it does not affect the
    // empty-state message.
    const hasFilters =
      countActiveCatalogFilters(
        fixedBrand ? { ...filters, brand: null } : filters,
      ) > 0;

    return (
      <div className="rounded border border-dashed border-border p-16 text-center text-muted-foreground">
        {hasFilters
          ? "No hay fragancias con esos filtros. Probá limpiando alguno."
          : "Todavía no hay fragancias publicadas."}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4 lg:gap-7">
      {cards.map((product, index) => (
        <ProductCard
          key={product.slug}
          product={product}
          priority={index < 4}
          headingLevel={headingLevel}
        />
      ))}
    </div>
  );
}

/**
 * The caller formats the result total for its Spanish UI context.
 */
export async function FraseTotal({
  filters,
  format,
}: {
  filters: CatalogFilters;
  format: (total: number) => string;
}) {
  const { total } = await listCatalogCached(filters);
  return format(total);
}
