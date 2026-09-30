"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useQueryStates } from "nuqs";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  countActiveCatalogFilters,
  catalogFilterQueryOptions,
  catalogFilterParsers,
} from "@/lib/store/filters";
import type { FilterOptions } from "@/lib/store/queries";
import {
  GenderChips,
  VariantKindChips,
  ClearFilters,
  AccordSelect,
  BrandSelect,
  NoteSelect,
  PriceSelect,
} from "./filter-controls";
import { CatalogSearch } from "./search";

/**
 * Mobile filter drawer. The applied-filter count is derived from URL state in
 * the client, while the result count is rendered by the server.
 */
export function FilterDrawer({
  filterOptions,
  fixedBrand,
  applyText,
}: {
  filterOptions: FilterOptions;
  fixedBrand?: string;
  applyText: ReactNode;
}) {
  const [filters] = useQueryStates(
    catalogFilterParsers,
    catalogFilterQueryOptions,
  );
  const activeFilterCount = countActiveCatalogFilters(
    fixedBrand ? { ...filters, brand: null } : filters,
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-12 flex-1 items-center justify-center gap-2.5 rounded border text-sm font-semibold transition-colors",
            activeFilterCount > 0
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-muted",
          )}
        >
          <SlidersHorizontal className="size-4" />
          {activeFilterCount > 0 ? `Filtrar · ${activeFilterCount}` : "Filtrar"}
        </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="flex max-h-[88dvh] flex-col gap-0 rounded-t-xl border-border px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <SheetTitle className="text-[22px] font-extrabold tracking-[-0.02em]">
          Filtros
        </SheetTitle>

        <div className="mt-6 flex flex-1 flex-col gap-6 overflow-y-auto">
          {/* Mobile users only access text search from this drawer. */}
          <div className="flex flex-col gap-[11px]">
            <span className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Buscar
            </span>
            <CatalogSearch height="h-[50px]" />
          </div>

          <div className="flex flex-col gap-[11px]">
            <span className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Género
            </span>
            <GenderChips />
          </div>

          <div className="flex flex-col gap-[11px]">
            <span className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Presentación
            </span>
            <VariantKindChips />
          </div>

          <div className="flex flex-col gap-2.5">
            {fixedBrand ? null : (
              <BrandSelect
                filterOptions={filterOptions.brands}
                className="h-[50px] w-full"
              />
            )}
            <AccordSelect
              filterOptions={filterOptions.accords}
              className="h-[50px] w-full"
            />
            <NoteSelect
              filterOptions={filterOptions.notes}
              className="h-[50px] w-full"
            />
            <PriceSelect className="h-[50px] w-full" />
          </div>
        </div>

        <div className="mt-6 flex gap-2.5">
          <SheetClose asChild>
            <ClearFilters variant="button" text="Limpiar" />
          </SheetClose>
          <SheetClose asChild>
            <button
              type="button"
              className="flex h-[54px] flex-1 items-center justify-center rounded bg-primary text-[15px] font-semibold text-primary-foreground hover:bg-primary/80"
            >
              {applyText}
            </button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
