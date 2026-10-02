import { Suspense, type ReactNode } from "react";
import type { FilterOptions } from "@/lib/store/queries";
import type { CatalogFilters } from "@/lib/store/filters";
import { countActiveCatalogFilters } from "@/lib/store/filters";
import { FilterDrawer } from "./filter-drawer";
import { FraseTotal, CatalogGrid } from "./grid";
import { CatalogGridSkeleton } from "./grid-skeleton";
import { CatalogPagination } from "./pagination";
import { FilterPanel } from "./filter-panel";
import { OrderSelect } from "./order-select";
import { CatalogSearch } from "./search";

const FALLBACK_TOTAL = (
  <span className="inline-block h-[1em] w-40 animate-pulse rounded-sm bg-muted align-middle" />
);

/**
 * Catalog body rendered by the home page.
 *
 * Filter options are requested once by the page and passed as props. The
 * asynchronous catalog results render inside separate Suspense boundaries so
 * the filter controls stay visible while the grid updates.
 */
export function CatalogSection({
  filters,
  title,
  filterOptions,
  headingLevel: Heading = "h1",
  mobileInsert,
}: {
  filters: CatalogFilters;
  title: string;
  filterOptions: FilterOptions;
  /**
   * The home page uses h2 because the hero logo is h1. Product cards continue
   * from that level.
   */
  headingLevel?: "h1" | "h2";
  /** Shown only on mobile, after the first row of the first results page. */
  mobileInsert?: ReactNode;
}) {
  const catalogGridKey = JSON.stringify(filters);

  return (
    <section
      id="catalogo"
      className="mx-auto max-w-page px-5 pt-10 pb-16 lg:px-16 lg:pb-24"
    >
      <div className="mb-8 flex flex-col gap-4 border-t border-border pt-8 lg:mb-10 lg:flex-row lg:items-end lg:justify-between lg:pt-10">
        <div className="flex flex-col gap-1.5">
          <Heading className="text-[32px] leading-none font-extrabold tracking-[-0.03em] lg:text-[44px]">
            {title}
          </Heading>
          <p className="text-[13px] text-muted-foreground lg:text-sm">
            <Suspense fallback={FALLBACK_TOTAL}>
              <FraseTotal
                filters={filters}
                format={(n) =>
                  `${n} fragancia${n === 1 ? "" : "s"} disponible${n === 1 ? "" : "s"}`
                }
              />
            </Suspense>
          </p>
        </div>

        <div className="hidden items-center gap-2.5 lg:flex">
          <span className="text-xs font-bold tracking-[0.12em] text-muted-foreground">
            ORDENAR
          </span>
          <OrderSelect className="min-w-[190px] rounded border-border bg-card py-2.5" />
        </div>
      </div>

      <div className="mb-10 hidden lg:block">
        <FilterPanel
          filterOptions={filterOptions}
          moreFiltersOpen={
            countActiveCatalogFilters({ ...filters, variantKind: null }) > 0
          }
        />
      </div>

      <div className="mb-3 lg:hidden">
        <CatalogSearch height="h-12" />
      </div>

      <div className="mb-5 flex items-center gap-2.5 lg:hidden">
        <FilterDrawer
          filterOptions={filterOptions}
          applyText={
            <Suspense fallback="Ver fragancias">
              <FraseTotal
                filters={filters}
                format={(n) => `Ver ${n} fragancia${n === 1 ? "" : "s"}`}
              />
            </Suspense>
          }
        />
        <OrderSelect className="h-12 rounded border-border bg-card px-4" />
      </div>

      <Suspense key={catalogGridKey} fallback={<CatalogGridSkeleton />}>
        <CatalogGrid
          filters={filters}
          headingLevel={Heading === "h1" ? "h2" : "h3"}
          afterFirstRow={filters.page === 1 ? mobileInsert : undefined}
        />
        <CatalogPagination filters={filters} />
      </Suspense>
    </section>
  );
}
