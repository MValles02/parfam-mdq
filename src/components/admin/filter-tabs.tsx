"use client";

import { parseAsStringEnum, useQueryStates } from "nuqs";
import { cn } from "@/lib/utils";

/**
 * URL-backed status filter tabs shared by the product and order listings. The
 * established `estado` key remains at the URL boundary.
 */
export function FilterTabs<T extends string>({
  options,
  defaultValue,
}: {
  options: { id: T; label: string }[];
  defaultValue: T;
}) {
  const ids = options.map((option) => option.id) as [T, ...T[]];
  const [{ estado }, setState] = useQueryStates(
    { estado: parseAsStringEnum<T>(ids).withDefault(defaultValue) },
    { shallow: false, clearOnDefault: true },
  );

  return (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      {options.map((option) => {
        const isActive = estado === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setState({ estado: option.id })}
            className={cn(
              "rounded border px-3.5 py-1.5 text-[13px] font-medium",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
