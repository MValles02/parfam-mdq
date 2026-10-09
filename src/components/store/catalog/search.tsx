"use client";

import { useEffect, useId, useState } from "react";
import Form from "next/form";
import { usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { useQueryStates } from "nuqs";
import { Input } from "@/components/ui/input";
import { cn, FOCUS_VISIBLE } from "@/lib/utils";
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
        className={cn("rounded pr-11 pl-9 text-base lg:text-sm", height)}
      />
      {value !== "" && (
        <button
          type="button"
          aria-label="Borrar búsqueda"
          onClick={() => setValue("")}
          className={cn(
            "absolute top-1/2 right-0 flex size-11 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground",
            FOCUS_VISIBLE,
          )}
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Header search. On the home page it drives the catalog filters in place; on
 * any other page it submits a plain GET to `/?q=`, which the home page reads
 * through the same `q` URL key.
 */
export function StoreSearch({
  className,
  height,
}: {
  className?: string;
  height?: string;
}) {
  const pathname = usePathname();
  const id = useId();

  if (pathname === "/") {
    return <CatalogSearch className={className} height={height} />;
  }

  return (
    <Form action="/" className={cn("relative w-full", className)}>
      <label htmlFor={id} className="sr-only">
        Buscar fragancia o marca
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        name="q"
        placeholder="Buscar fragancia o marca"
        enterKeyHint="search"
        className={cn("rounded pl-9 text-base lg:text-sm", height ?? "h-9")}
      />
    </Form>
  );
}
