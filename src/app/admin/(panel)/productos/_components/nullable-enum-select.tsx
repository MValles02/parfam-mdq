"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Select over an enum that also offers "Sin especificar". Radix Select cannot
 * hold null, so `noneValue` stands in for it and is mapped back to null.
 */
export function NullableEnumSelect<T extends string>({
  value,
  onChange,
  options,
  labels,
  noneValue,
}: {
  value: T | null | undefined;
  onChange: (value: T | null) => void;
  /** Enum values in display order. */
  options: T[];
  labels: Record<T, string>;
  noneValue: string;
}) {
  return (
    <Select
      value={value ?? noneValue}
      onValueChange={(v) => onChange(v === noneValue ? null : (v as T))}
    >
      <SelectTrigger className="w-full bg-background">
        <SelectValue placeholder="Elegir" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={noneValue}>Sin especificar</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {labels[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
