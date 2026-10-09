"use client";

import { Controller, type Control } from "react-hook-form";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/admin/field";
import type { ProductFormInput } from "@/lib/validations/product";
import { createPerfumerAction, searchPerfumersAction } from "../actions";
import type { NameEntry, NamesById } from "./product-form-values";
import { RemoteCombobox } from "./remote-combobox";

/** Perfumer chips with search, plus creating a perfumer missing from the list. */
export function PerfumerField({
  control,
  names,
  onNamesChange,
  isAutofilled,
}: {
  control: Control<ProductFormInput>;
  names: NamesById;
  onNamesChange: (entries: NameEntry[]) => void;
  isAutofilled: boolean;
}) {
  return (
    <Field label="Perfumista" isAutofilled={isAutofilled}>
      <Controller
        control={control}
        name="perfumerIds"
        render={({ field }) => (
          <div className="flex flex-wrap items-center gap-1.5">
            {(field.value ?? []).map((id) => (
              <span
                key={id}
                className="flex items-center gap-1.5 rounded-sm border bg-background py-1.5 pr-1.5 pl-2.5 text-xs font-medium"
              >
                {names[id] ?? "—"}
                <button
                  type="button"
                  aria-label={`Quitar a ${names[id] ?? "este perfumista"}`}
                  onClick={() =>
                    field.onChange((field.value ?? []).filter((x) => x !== id))
                  }
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <RemoteCombobox
              placeholder="Buscar perfumista…"
              emptyText="Ninguno con ese nombre."
              search={async (query) => {
                const result = await searchPerfumersAction(query);
                return result.ok
                  ? result.data.map((perfumer) => ({
                      id: perfumer.id,
                      label: perfumer.name,
                    }))
                  : [];
              }}
              onCreate={async (name) => {
                const result = await createPerfumerAction(name);
                if (!result.ok) {
                  toast.error(result.message);
                  return null;
                }
                return {
                  id: result.data.id,
                  label: result.data.name,
                };
              }}
              onSelect={(option) => {
                onNamesChange([[option.id, option.label]]);
                const currentIds = field.value ?? [];
                if (!currentIds.includes(option.id)) {
                  field.onChange([...currentIds, option.id]);
                }
              }}
            >
              <button
                type="button"
                className="rounded-sm border border-dashed px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-solid hover:text-foreground"
              >
                + Agregar
              </button>
            </RemoteCombobox>
          </div>
        )}
      />
    </Field>
  );
}
