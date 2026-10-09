"use client";

import { Controller, type Control } from "react-hook-form";
import { Field } from "@/components/admin/field";
import { Input } from "@/components/ui/input";
import type { ProductFormInput } from "@/lib/validations/product";
import { parsePercentageInput } from "./percentage";

/** Form fields holding a 0..100 season or daypart percentage. */
export type PercentageFieldName =
  | "seasonSpring"
  | "seasonSummer"
  | "seasonFall"
  | "seasonWinter"
  | "daypartDay"
  | "daypartNight";

/** Digits-only 0..100 percentage input, used for the season and daypart split. */
function PercentageInput({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex items-center rounded-md border bg-background pr-2.5">
      <Input
        id={id}
        inputMode="numeric"
        value={value ?? ""}
        placeholder="0"
        onChange={(e) => onChange(parsePercentageInput(e.target.value))}
        className="border-0 bg-transparent shadow-none focus-visible:ring-0"
      />
      <span className="shrink-0 text-xs text-muted-foreground">%</span>
    </div>
  );
}

export function PercentageField({
  control,
  name,
  label,
}: {
  control: Control<ProductFormInput>;
  name: PercentageFieldName;
  label: string;
}) {
  return (
    <Field label={label} htmlFor={name}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <PercentageInput
            id={name}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
    </Field>
  );
}
