"use client";

import { cn } from "@/lib/utils";

/**
 * Five-step characteristic control. Administrators set these values directly;
 * Fragrantica community ratings are internal reference data and never publish.
 */
export function CharacteristicBar({
  value,
  onChange,
  label,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((step) => {
        const isActive = (value ?? 0) >= step;
        return (
          <button
            key={step}
            type="button"
            aria-label={`${label}: ${step} de 5`}
            aria-pressed={isActive}
            // Selecting the active step clears the value without a page reload.
            onClick={() => onChange(value === step ? null : step)}
            className={cn(
              "h-7 flex-1 rounded-sm border transition-colors",
              isActive
                ? "border-primary bg-primary"
                : "bg-background hover:border-muted-foreground",
            )}
          />
        );
      })}
      <span className="ml-2 w-8 shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
        {value ? `${value}/5` : "—"}
      </span>
    </div>
  );
}
