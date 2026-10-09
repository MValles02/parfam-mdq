import { cache } from "react";
import { ProductCard } from "@/components/store/product-card";
import { listCatalog } from "@/lib/store/queries";
import { getSiteSettings } from "@/lib/settings";
import { buildWhatsAppLink } from "@/lib/whatsapp";
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
  headingLevel = "h2",
}: {
  filters: CatalogFilters;
  headingLevel?: "h2" | "h3";
}) {
  const { cards } = await listCatalogCached(filters);

  if (cards.length === 0) {
    const query = filters.search.trim();
    if (query) {
      const { whatsappNumber } = await getSiteSettings();
      return (
        <div className="flex flex-col items-center gap-3 rounded border border-dashed border-border p-10 text-center lg:p-16">
          <p className="font-bold">No encontramos “{query}”.</p>
          <p className="text-muted-foreground">
            Puede que lo consigamos igual. Preguntanos por WhatsApp.
          </p>
          <a
            href={buildWhatsAppLink(whatsappNumber, `Hola, ¿tienen ${query}?`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex min-h-11 items-center justify-center rounded bg-whatsapp px-6 text-sm font-semibold text-whatsapp-foreground hover:bg-whatsapp/90"
          >
            Preguntar por WhatsApp
          </a>
        </div>
      );
    }

    const hasFilters = countActiveCatalogFilters(filters) > 0;

    return (
      <div className="rounded border border-dashed border-border p-16 text-center text-muted-foreground">
        {hasFilters
          ? "No hay fragancias con esos filtros. Probá limpiando alguno."
          : "Todavía no hay fragancias publicadas."}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-3 lg:gap-7">
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
