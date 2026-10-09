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
import { FILTER_LABEL_CLASS } from "./filter-label";

/** Full-width selects inside the sidebar. */
const SELECT_CLASS = "w-full";

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className={FILTER_LABEL_CLASS}>
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
          className={SELECT_CLASS}
        />
      </FilterRow>

      <FilterRow label="Marca">
        <BrandSelect filterOptions={filterOptions.brands} className={SELECT_CLASS} />
      </FilterRow>

      <FilterRow label="Con la nota">
        <NoteSelect filterOptions={filterOptions.notes} className={SELECT_CLASS} />
      </FilterRow>

      <FilterRow label="Precio">
        <PriceSelect className={SELECT_CLASS} />
      </FilterRow>
    </div>
  );
}
