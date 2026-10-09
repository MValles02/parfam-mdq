"use client";

import { X } from "lucide-react";
import { useQueryStates } from "nuqs";
import { cn, FOCUS_VISIBLE } from "@/lib/utils";
import { GENDER_LABELS, VARIANT_KIND_LABELS } from "@/lib/catalog";
import {
  PRICE_RANGE_LABELS,
  catalogFilterParsers,
  catalogFilterQueryOptions,
} from "@/lib/store/filters";
import type { FilterOptions } from "@/lib/store/queries";

type FilterKey =
  | "search"
  | "gender"
  | "variantKind"
  | "brand"
  | "accord"
  | "note"
  | "priceRange";

function labelFor(
  options: { slug: string; name: string }[],
  slug: string,
): string {
  return options.find((option) => option.slug === slug)?.name ?? slug;
}

/**
 * One removable chip per applied filter. Slugs resolve to display names
 * through the options the server already loaded, so no query runs here.
 */
export function ActiveFilterChips({
  filterOptions,
  className,
}: {
  filterOptions: FilterOptions;
  className?: string;
}) {
  const [
    { search, gender, variantKind, brand, accord, note, priceRange },
    setFilters,
  ] = useQueryStates(catalogFilterParsers, catalogFilterQueryOptions);
  const chips: { key: FilterKey; label: string }[] = [];
  if (search.trim()) chips.push({ key: "search", label: `“${search.trim()}”` });
  if (gender) chips.push({ key: "gender", label: GENDER_LABELS[gender] });
  if (variantKind) {
    chips.push({ key: "variantKind", label: VARIANT_KIND_LABELS[variantKind] });
  }
  if (brand) {
    chips.push({ key: "brand", label: labelFor(filterOptions.brands, brand) });
  }
  if (accord) {
    chips.push({
      key: "accord",
      label: labelFor(filterOptions.accords, accord),
    });
  }
  if (note) {
    chips.push({ key: "note", label: labelFor(filterOptions.notes, note) });
  }
  if (priceRange) {
    chips.push({ key: "priceRange", label: PRICE_RANGE_LABELS[priceRange] });
  }

  if (chips.length === 0) return null;

  return (
    <ul
      className={cn(
        "flex items-center gap-2 overflow-x-auto lg:flex-wrap lg:overflow-visible",
        className,
      )}
    >
      {chips.map(({ key, label }) => (
        <li key={key} className="shrink-0">
          <button
            type="button"
            aria-label={`Quitar filtro ${label}`}
            onClick={() => setFilters({ [key]: null, page: 1 })}
            className={cn(
              "flex min-h-11 items-center gap-1.5 rounded border border-input bg-card px-3 text-[13px] font-medium hover:bg-muted",
              FOCUS_VISIBLE,
            )}
          >
            {label}
            <X className="size-3.5" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
