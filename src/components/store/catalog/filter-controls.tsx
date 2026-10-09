"use client";

import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, FOCUS_VISIBLE } from "@/lib/utils";
import { GENDER_LABELS, VARIANT_KIND_LABELS } from "@/lib/catalog";
import {
  PRICE_RANGE_LABELS,
  GENDERS,
  VARIANT_KINDS,
  PRICE_RANGES,
  type PriceRange,
} from "@/lib/store/filters";
import type { FilterOptions } from "@/lib/store/queries";
import { useCatalogFilters } from "./use-catalog-filters";

/**
 * Catalog chips and selects shared by desktop and mobile. They read and write
 * the same URL state through `useCatalogFilters`, and every change returns to
 * the first results page.
 */

/**
 * Radix Select does not allow an empty item value, so the all-options item
 * uses this sentinel and is converted to null before updating the URL.
 */
const ALL_OPTIONS = "__all__";

function Chip({
  isActive,
  compact,
  segmented,
  onClick,
  children,
}: {
  isActive: boolean;
  compact?: boolean;
  /** Equal-width cell of a segmented control; the track supplies the border. */
  segmented?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        "rounded text-[13px] font-medium transition-colors",
        segmented
          ? cn(
              "h-10 px-1",
              isActive ? "bg-card font-semibold" : "text-muted-foreground",
            )
          : cn(
              "border px-[18px]",
              compact ? "h-9" : "h-[46px]",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background text-foreground hover:bg-muted",
            ),
        FOCUS_VISIBLE,
      )}
    >
      {children}
    </button>
  );
}

/** One chip per option plus a leading "all" chip that clears the filter. */
function FilterChips<T extends string>({
  allLabel,
  options,
  labels,
  value,
  compact,
  segmented,
  onSelect,
}: {
  allLabel: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T | null;
  compact?: boolean;
  segmented?: boolean;
  onSelect: (value: T | null) => void;
}) {
  return (
    <div
      className={
        segmented
          ? "grid grid-cols-4 rounded bg-muted p-[3px]"
          : "flex flex-wrap gap-2"
      }
    >
      <Chip
        isActive={!value}
        compact={compact}
        segmented={segmented}
        onClick={() => onSelect(null)}
      >
        {allLabel}
      </Chip>
      {options.map((option) => (
        <Chip
          key={option}
          isActive={value === option}
          compact={compact}
          segmented={segmented}
          onClick={() => onSelect(option)}
        >
          {labels[option]}
        </Chip>
      ))}
    </div>
  );
}

export function GenderChips({ compact = false }: { compact?: boolean }) {
  const [{ gender }, setFilters] = useCatalogFilters();

  return (
    <FilterChips
      allLabel="Todos"
      options={GENDERS}
      labels={GENDER_LABELS}
      value={gender}
      compact={compact}
      onSelect={(value) => setFilters({ gender: value, page: 1 })}
    />
  );
}

export function VariantKindChips({
  compact = false,
  segmented = false,
}: {
  compact?: boolean;
  segmented?: boolean;
}) {
  const [{ variantKind }, setFilters] = useCatalogFilters();

  return (
    <FilterChips
      allLabel="Todas"
      options={VARIANT_KINDS}
      labels={VARIANT_KIND_LABELS}
      value={variantKind}
      compact={compact}
      segmented={segmented}
      onSelect={(value) => setFilters({ variantKind: value, page: 1 })}
    />
  );
}

/** A select whose first item clears the filter (`null`). */
function FilterSelect({
  label,
  value,
  allOptionsLabel,
  onValueChange,
  className,
  children,
}: {
  label: string;
  value: string | null;
  allOptionsLabel: string;
  onValueChange: (value: string | null) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Select
      value={value ?? ALL_OPTIONS}
      onValueChange={(selected) =>
        onValueChange(selected === ALL_OPTIONS ? null : selected)
      }
    >
      <SelectTrigger aria-label={label} className={className}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_OPTIONS}>{allOptionsLabel}</SelectItem>
        {children}
      </SelectContent>
    </Select>
  );
}

export function BrandSelect({
  filterOptions,
  className,
}: {
  filterOptions: FilterOptions["brands"];
  className?: string;
}) {
  const [{ brand }, setFilters] = useCatalogFilters();

  return (
    <FilterSelect
      label="Marca"
      allOptionsLabel="Todas las marcas"
      value={brand}
      onValueChange={(value) => setFilters({ brand: value, page: 1 })}
      className={className}
    >
      {filterOptions.map((option) => (
        <SelectItem key={option.slug} value={option.slug}>
          {option.name}
        </SelectItem>
      ))}
    </FilterSelect>
  );
}

export function AccordSelect({
  filterOptions,
  className,
}: {
  filterOptions: FilterOptions["accords"];
  className?: string;
}) {
  const [{ accord }, setFilters] = useCatalogFilters();

  return (
    <FilterSelect
      label="Familia olfativa"
      allOptionsLabel="Todas las familias"
      value={accord}
      onValueChange={(value) => setFilters({ accord: value, page: 1 })}
      className={className}
    >
      {filterOptions.map((option) => (
        <SelectItem key={option.slug} value={option.slug}>
          <span className="flex items-center gap-2">
            {/* Accord color comes from the database, not a design-system hex. */}
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: option.color }}
            />
            {option.name}
          </span>
        </SelectItem>
      ))}
    </FilterSelect>
  );
}

export function NoteSelect({
  filterOptions,
  className,
}: {
  filterOptions: FilterOptions["notes"];
  className?: string;
}) {
  const [{ note }, setFilters] = useCatalogFilters();

  return (
    <FilterSelect
      label="Nota"
      allOptionsLabel="Todas las notas"
      value={note}
      onValueChange={(value) => setFilters({ note: value, page: 1 })}
      className={className}
    >
      {filterOptions.map((option) => (
        <SelectItem key={option.slug} value={option.slug}>
          {option.name}
        </SelectItem>
      ))}
    </FilterSelect>
  );
}

export function PriceSelect({ className }: { className?: string }) {
  const [{ priceRange }, setFilters] = useCatalogFilters();

  return (
    <FilterSelect
      label="Precio"
      allOptionsLabel="Todos los precios"
      value={priceRange}
      onValueChange={(value) =>
        setFilters({ priceRange: value as PriceRange | null, page: 1 })
      }
      className={className}
    >
      {PRICE_RANGES.map((range) => (
        <SelectItem key={range} value={range}>
          {PRICE_RANGE_LABELS[range]}
        </SelectItem>
      ))}
    </FilterSelect>
  );
}

export function ClearFilters({
  variant = "link",
  text = "Limpiar filtros",
}: {
  variant?: "link" | "button";
  text?: string;
}) {
  const [, setFilters] = useCatalogFilters();

  return (
    <button
      type="button"
      onClick={() => setFilters(null)}
      className={cn(
        variant === "link"
          ? "inline-flex min-h-11 items-center text-[13px] font-medium text-muted-foreground underline underline-offset-[3px] hover:text-foreground"
          : "flex h-[54px] items-center justify-center rounded border border-input px-[22px] text-sm font-semibold text-muted-foreground hover:bg-muted",
        FOCUS_VISIBLE,
      )}
    >
      {text}
    </button>
  );
}
