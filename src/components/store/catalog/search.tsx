"use client";

import { useEffect, useId, useState } from "react";
import { Search } from "lucide-react";
import { useQueryStates } from "nuqs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  catalogFilterQueryOptions,
  catalogFilterParsers,
} from "@/lib/store/filters";

const DEBOUNCE_MS = 300;

/**
 * The input keeps local state and writes to the URL after a debounce. This
 * avoids blocking keystrokes while a non-shallow URL update reaches the
 * server and returns through the router.
 */
export function CatalogSearch({
  className,
  height = "h-9",
}: {
  className?: string;
  /** Mobile uses a taller input to preserve a comfortable touch target. */
  height?: string;
}) {
  const [{ search }, setFilters] = useQueryStates(
    catalogFilterParsers,
    catalogFilterQueryOptions,
  );
  const [value, setValue] = useState(search);
  const [lastSearch, setLastSearch] = useState(search);
  // Keep our own pending URL value to prevent an older server response from
  // overwriting a faster sequence of keystrokes.
  const [submittedSearch, setSubmittedSearch] = useState(search);
  const id = useId();

  if (search !== lastSearch) {
    setLastSearch(search);
    if (search !== submittedSearch) setValue(search);
  }

  useEffect(() => {
    if (value === search) return;
    const searchTerm = value.trim();
    const timeout = setTimeout(() => {
      setSubmittedSearch(searchTerm === "" ? "" : value);
      setFilters({ search: searchTerm === "" ? null : value, page: 1 });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [value, search, setFilters]);

  return (
    <div className={cn("relative w-full", className)}>
      <label htmlFor={id} className="sr-only">
        Buscar fragancia o marca
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar fragancia o marca"
        enterKeyHint="search"
        autoComplete="off"
        className={cn("rounded pl-9 text-base lg:text-sm", height)}
      />
    </div>
  );
}
