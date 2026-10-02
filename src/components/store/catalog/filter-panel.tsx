import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { FilterOptions } from "@/lib/store/queries";
import { CatalogSearch } from "./search";
import {
  GenderChips,
  VariantKindChips,
  ClearFilters,
  AccordSelect,
  BrandSelect,
  NoteSelect,
  PriceSelect,
} from "./filter-controls";

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-[104px] shrink-0 text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

/**
 * Desktop filter controls. Presentation chips are the primary set; every other
 * filter lives in a native disclosure (keyboard accessible by default) that
 * starts open when one of them is active, so active state is never hidden.
 */
export function FilterPanel({
  filterOptions,
  moreFiltersOpen = false,
}: {
  filterOptions: FilterOptions;
  moreFiltersOpen?: boolean;
}) {
  return (
    <div className="flex flex-col gap-[18px] rounded border border-border bg-card p-[22px_24px]">
      <div className="flex items-center gap-4">
        <span className="w-[104px] shrink-0 text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
          PRESENTACIÓN
        </span>
        <VariantKindChips />
        <div className="flex-1" />
        <ClearFilters />
      </div>

      <details open={moreFiltersOpen} className="group">
        <summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-[13px] font-medium underline underline-offset-[3px] hover:text-muted-foreground">
          Más filtros
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>

        <div className="mt-3 flex flex-col gap-[18px]">
          <FilterRow label="BUSCAR">
            <CatalogSearch />
          </FilterRow>

          <FilterRow label="GÉNERO">
            <GenderChips />
          </FilterRow>

          <Separator />

          <div className="flex flex-wrap items-center gap-3">
            <BrandSelect
              filterOptions={filterOptions.brands}
              className="min-w-[210px]"
            />
            <AccordSelect
              filterOptions={filterOptions.accords}
              className="min-w-[210px]"
            />
            <NoteSelect
              filterOptions={filterOptions.notes}
              className="min-w-[210px]"
            />
            <PriceSelect className="min-w-[210px]" />
          </div>
        </div>
      </details>
    </div>
  );
}
