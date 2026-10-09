"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SheetCloseButton } from "@/components/store/sheet-close-button";
import { cn } from "@/lib/utils";
import { countActiveCatalogFilters } from "@/lib/store/filters";
import type { FilterOptions } from "@/lib/store/queries";
import {
  GenderChips,
  ClearFilters,
  AccordSelect,
  BrandSelect,
  NoteSelect,
  PriceSelect,
} from "./filter-controls";
import { FILTER_LABEL_CLASS } from "./filter-label";
import { useCatalogFilters } from "./use-catalog-filters";

/** Full-width selects with a comfortable touch height. */
const SELECT_CLASS = "h-[50px] w-full";

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[11px]">
      <span className={FILTER_LABEL_CLASS}>{label}</span>
      {children}
    </div>
  );
}

/**
 * Mobile filter drawer. The applied-filter count is derived from URL state in
 * the client, while the result count is rendered by the server.
 */
export function FilterDrawer({
  filterOptions,
  applyText,
}: {
  filterOptions: FilterOptions;
  applyText: ReactNode;
}) {
  const [filters] = useCatalogFilters();
  const activeFilterCount = countActiveCatalogFilters(filters);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-11 shrink-0 items-center justify-center gap-2.5 rounded border px-4 text-sm font-semibold transition-colors",
            activeFilterCount > 0
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-muted",
          )}
        >
          <SlidersHorizontal className="size-4" />
          {activeFilterCount > 0 ? `Filtros · ${activeFilterCount}` : "Filtros"}
        </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="flex max-h-[88dvh] flex-col gap-0 rounded-t-xl border-border px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <SheetTitle className="text-[22px] font-extrabold tracking-[-0.02em]">
          Filtros
        </SheetTitle>

        <div className="mt-6 flex flex-1 flex-col gap-6 overflow-y-auto">
          <FilterGroup label="Para quién">
            <GenderChips />
          </FilterGroup>

          <div className="flex flex-col gap-2.5">
            <BrandSelect
              filterOptions={filterOptions.brands}
              className={SELECT_CLASS}
            />
            <AccordSelect
              filterOptions={filterOptions.accords}
              className={SELECT_CLASS}
            />
            <NoteSelect
              filterOptions={filterOptions.notes}
              className={SELECT_CLASS}
            />
            <PriceSelect className={SELECT_CLASS} />
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

        <SheetCloseButton />
      </SheetContent>
    </Sheet>
  );
}
