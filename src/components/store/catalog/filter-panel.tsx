import type { ReactNode } from "react";
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
 * Desktop filter controls.
 */
export function FilterPanel({
  filterOptions,
}: {
  filterOptions: FilterOptions;
}) {
  return (
    <div className="flex flex-col gap-[18px] rounded border border-border bg-card p-[22px_24px]">
      <FilterRow label="BUSCAR">
        <CatalogSearch />
      </FilterRow>

      <FilterRow label="GÉNERO">
        <GenderChips compact />
      </FilterRow>

      <FilterRow label="PRESENTACIÓN">
        <VariantKindChips compact />
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
        <div className="flex-1" />
        <ClearFilters />
      </div>
    </div>
  );
}
