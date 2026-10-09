import type { ReactNode } from "react";
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

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

/** Desktop sidebar with every catalog filter; search lives in the header. */
export function FilterPanel({
  filterOptions,
}: {
  filterOptions: FilterOptions;
}) {
  return (
    <div className="flex flex-col gap-5 rounded border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">Filtros</span>
        <ClearFilters />
      </div>

      <FilterRow label="Presentación">
        <VariantKindChips compact />
      </FilterRow>

      <FilterRow label="Para quién">
        <GenderChips compact />
      </FilterRow>

      <FilterRow label="Familia olfativa">
        <AccordSelect
          filterOptions={filterOptions.accords}
          className="w-full"
        />
      </FilterRow>

      <FilterRow label="Marca">
        <BrandSelect filterOptions={filterOptions.brands} className="w-full" />
      </FilterRow>

      <FilterRow label="Con la nota">
        <NoteSelect filterOptions={filterOptions.notes} className="w-full" />
      </FilterRow>

      <FilterRow label="Precio">
        <PriceSelect className="w-full" />
      </FilterRow>
    </div>
  );
}
