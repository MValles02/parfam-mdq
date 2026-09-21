"use client";

import { parseAsInteger, parseAsStringEnum, useQueryStates } from "nuqs";
import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("es-AR");

/**
 * URL-backed status filter tabs shared by products, orders, and notes. The
 * established `estado` key remains at the URL boundary. `resetPage` follows
 * the same paginated-listing rule as AdminSearch.
 */
export function FilterTabs<T extends string>({
  options,
  defaultValue,
  counts,
  resetPage = false,
}: {
  options: { id: T; label: string }[];
  defaultValue: T;
  counts?: Record<T, number>;
  resetPage?: boolean;
}) {
  const ids = options.map((option) => option.id) as [T, ...T[]];
  const [{ estado }, setState] = useQueryStates(
    {
      estado: parseAsStringEnum<T>(ids).withDefault(defaultValue),
      pagina: parseAsInteger.withDefault(1),
    },
    { shallow: false, clearOnDefault: true },
  );

  return (
    <div className="flex items-center gap-2">
      {options.map((option) => {
        const isActive = estado === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() =>
              setState(
                resetPage
                  ? { estado: option.id, pagina: null }
                  : { estado: option.id },
              )
            }
            className={cn(
              "rounded border px-3.5 py-1.5 text-[13px] font-medium",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {option.label}
            {counts ? (
              <>
                {" "}
                <span
                  className={cn(
                    isActive
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground",
                  )}
                >
                  {numberFormatter.format(counts[option.id])}
                </span>
              </>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
