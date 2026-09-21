"use client";

import { useQueryStates } from "nuqs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SORT_LABELS,
  SORT_OPTIONS,
  catalogFilterQueryOptions,
  catalogFilterParsers,
  type SortOption,
} from "@/lib/store/filters";

/** The catalog sort selector shared by desktop and mobile. */
export function OrderSelect({ className }: { className?: string }) {
  const [{ sort }, setFilters] = useQueryStates(
    catalogFilterParsers,
    catalogFilterQueryOptions,
  );

  return (
    <Select
      value={sort}
      onValueChange={(value) =>
        setFilters({ sort: value as SortOption, page: 1 })
      }
    >
      <SelectTrigger aria-label="Ordenar" className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {SORT_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
