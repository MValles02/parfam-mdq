import { Suspense, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { FilterOptions } from "@/lib/store/queries";
import type { CatalogFilters } from "@/lib/store/filters";
import { CATALOG_SECTION_ID } from "@/lib/store/links";
import { ActiveFilterChips } from "./active-filter-chips";
import { VariantKindChips } from "./filter-controls";
import { FilterDrawer } from "./filter-drawer";
import { CatalogResultCount, CatalogGrid } from "./grid";
import { CatalogGridSkeleton } from "./grid-skeleton";
import { CatalogPagination } from "./pagination";
import { FilterPanel } from "./filter-panel";
import { OrderSelect } from "./order-select";

/** Spanish plural ending for "fragancia". */
function pluralSuffix(count: number): string {
  return count === 1 ? "" : "s";
}

const FALLBACK_TOTAL = (
  <span className="inline-block h-[1em] w-40 animate-pulse rounded-sm bg-muted align-middle" />
);

function Total({ filters }: { filters: CatalogFilters }): ReactNode {
  return (
    <Suspense fallback={FALLBACK_TOTAL}>
      <CatalogResultCount
        filters={filters}
        format={(n) => `${n} fragancia${pluralSuffix(n)}`}
      />
    </Suspense>
  );
}

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
}: {
  filters: CatalogFilters;
  title: string;
  filterOptions: FilterOptions;
  /**
   * The home view uses h2 because the hero logo is h1. Product cards continue
   * from that level.
   */
  headingLevel?: "h1" | "h2";
}) {
  const catalogGridKey = JSON.stringify(filters);
  const isHome = Heading === "h2";

  return (
    <section
      id={CATALOG_SECTION_ID}
      className={cn(
        "mx-auto max-w-page px-5 pb-16 lg:px-16 lg:pb-24",
        isHome ? "pt-10" : "pt-8",
      )}
    >
      <div
        className={cn(
          "mb-6 flex flex-col gap-1.5 lg:mb-8",
          isHome && "border-t border-border pt-8 lg:pt-10",
        )}
      >
        <Heading className="text-[32px] leading-none font-extrabold tracking-[-0.03em] lg:text-[44px]">
          {title}
        </Heading>
      </div>

      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
        <aside className="hidden lg:block">
          <FilterPanel filterOptions={filterOptions} />
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-col gap-3 lg:hidden">
            <VariantKindChips segmented />
            <div className="flex items-center gap-2.5">
              <FilterDrawer
                filterOptions={filterOptions}
                applyText={
                  <Suspense fallback="Ver fragancias">
                    <CatalogResultCount
                      filters={filters}
                      format={(n) => `Ver ${n} fragancia${pluralSuffix(n)}`}
                    />
                  </Suspense>
                }
              />
              <ActiveFilterChips
                filterOptions={filterOptions}
                className="min-w-0 flex-1"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] text-muted-foreground">
                <Total filters={filters} />
              </p>
              <OrderSelect className="h-11 rounded border-border bg-card px-4" />
            </div>
          </div>

          <div className="mb-6 hidden items-start justify-between gap-4 lg:flex">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                <Total filters={filters} />
              </p>
              <ActiveFilterChips filterOptions={filterOptions} />
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
                Ordenar
              </span>
              <OrderSelect className="min-w-[190px] rounded border-border bg-card py-2.5" />
            </div>
          </div>

          <Suspense key={catalogGridKey} fallback={<CatalogGridSkeleton />}>
            <CatalogGrid
              filters={filters}
              headingLevel={Heading === "h1" ? "h2" : "h3"}
            />
            <CatalogPagination filters={filters} />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
