"use client";

import { useId } from "react";
import {
  Controller,
  useFieldArray,
  useWatch,
  type Control,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { VariantKind } from "@/generated/prisma/enums";
import { VARIANT_KIND_LABELS as variantKindLabels } from "@/lib/catalog";
import type { ProductFormInput } from "@/lib/validations/product";
import { cn } from "@/lib/utils";

const COLUMNS = "grid-cols-[1.4fr_0.8fr_1.2fr_1fr_1fr_60px]";

/** Typical sizes for each variant, used only as datalist suggestions. */
const SIZE_SUGGESTIONS_ML: Record<VariantKind, number[]> = {
  FULL_BOTTLE: [30, 50, 100, 125, 200],
  TESTER: [50, 100, 125],
  DECANT: [2, 3, 5, 10, 15],
};

export function VariantEditor({
  control,
  disabled,
  errorGeneral,
}: {
  control: Control<ProductFormInput>;
  disabled?: boolean;
  errorGeneral?: string;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
  });
  // `useFieldArray` changes `field.id` every render, which causes hydration
  // mismatches for the server/client `list` attribute. `useId` stays stable.
  const datalistId = useId();

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className={cn(
          "hidden gap-3.5 px-3.5 pb-1 md:grid",
          COLUMNS,
          "[&>span]:text-[10px] [&>span]:font-bold [&>span]:tracking-[0.14em] [&>span]:text-muted-foreground [&>span]:uppercase",
        )}
      >
        <span>Tipo</span>
        <span>Tamaño</span>
        <span>Precio (ARS)</span>
        <span>SKU</span>
        <span>Disponible</span>
        <span />
      </div>

      {fields.map((field, index) => (
        <VariantRow
          key={field.id}
          control={control}
          index={index}
          datalistId={datalistId}
          disabled={disabled}
          onRemove={() => remove(index)}
        />
      ))}

      {/* One datalist per variant kind prevents irrelevant size suggestions. */}
      {Object.entries(SIZE_SUGGESTIONS_ML).map(([kind, sizes]) => (
        <datalist key={kind} id={`${datalistId}-${kind}`}>
          {sizes.map((size) => (
            <option key={size} value={size} />
          ))}
        </datalist>
      ))}

      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          append({
            id: null,
            kind: VariantKind.DECANT,
            sizeMl: 10,
            priceArs: "",
            isActive: true,
            sku: null,
          })
        }
        className="flex items-center justify-center gap-2 rounded-md border border-dashed p-3.5 text-[13px] font-semibold text-muted-foreground hover:border-solid hover:text-foreground disabled:opacity-50"
      >
        <Plus className="size-4" />
        Agregar presentación
      </button>

      {errorGeneral ? (
        <p className="text-xs font-medium text-destructive">{errorGeneral}</p>
      ) : null}
    </div>
  );
}

/**
 * This row owns `useWatch` to select relevant size suggestions. Hooks cannot
 * run from a `.map()` callback.
 */
function VariantRow({
  control,
  index,
  datalistId,
  disabled,
  onRemove,
}: {
  control: Control<ProductFormInput>;
  index: number;
  datalistId: string;
  disabled?: boolean;
  onRemove: () => void;
}) {
  const variantKind = useWatch({ control, name: `variants.${index}.kind` });

  return (
    <Controller
      control={control}
      name={`variants.${index}.isActive`}
      render={({ field: active }) => (
        <div
          className={cn(
            "grid items-center gap-3.5 rounded-md border p-3 md:p-3.5",
            COLUMNS.replace("grid-cols-", "md:grid-cols-"),
            "grid-cols-2",
            active.value ? "bg-background" : "bg-secondary/60",
          )}
        >
          <Controller
            control={control}
            name={`variants.${index}.kind`}
            render={({ field: kind }) => (
              <Select
                value={kind.value}
                onValueChange={kind.onChange}
                disabled={disabled}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(VariantKind).map((k) => (
                    <SelectItem key={k} value={k}>
                      {variantKindLabels[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />

          <Controller
            control={control}
            name={`variants.${index}.sizeMl`}
            render={({ field: ml, fieldState }) => (
              <div className="flex flex-col gap-1">
                <div className="relative">
                  <Input
                    inputMode="numeric"
                    placeholder="ml"
                    aria-label="Tamaño en mililitros"
                    list={`${datalistId}-${variantKind}`}
                    disabled={disabled}
                    className="bg-background pr-8"
                    value={ml.value ?? ""}
                    onChange={(e) => {
                      const inputValue = e.target.value.replace(/\D/g, "");
                      // An empty input is no fixed size, not zero.
                      ml.onChange(
                        inputValue === "" ? null : Number(inputValue),
                      );
                    }}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                    ml
                  </span>
                </div>
                {fieldState.error ? (
                  <p className="text-xs text-destructive">
                    {fieldState.error.message}
                  </p>
                ) : null}
              </div>
            )}
          />

          <Controller
            control={control}
            name={`variants.${index}.priceArs`}
            render={({ field: price, fieldState }) => (
              <div className="flex flex-col gap-1">
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    inputMode="decimal"
                    placeholder="0"
                    aria-label="Precio en pesos"
                    disabled={disabled}
                    className="bg-background pl-7 font-semibold"
                    value={price.value ?? ""}
                    onChange={(e) => price.onChange(e.target.value)}
                  />
                </div>
                {fieldState.error ? (
                  <p className="text-xs text-destructive">
                    {fieldState.error.message}
                  </p>
                ) : null}
              </div>
            )}
          />

          <Controller
            control={control}
            name={`variants.${index}.sku`}
            render={({ field: sku, fieldState }) => (
              <div className="flex flex-col gap-1">
                <Input
                  placeholder="SKU (opcional)"
                  aria-label="SKU de esta presentación"
                  disabled={disabled}
                  className="bg-background"
                  value={sku.value ?? ""}
                  onChange={(e) => sku.onChange(e.target.value)}
                />
                {fieldState.error ? (
                  <p className="text-xs text-destructive">
                    {fieldState.error.message}
                  </p>
                ) : null}
              </div>
            )}
          />

          <label className="flex cursor-pointer items-center gap-2.5">
            <Switch
              checked={active.value ?? true}
              onCheckedChange={active.onChange}
              disabled={disabled}
            />
            <span
              className={cn(
                "text-xs font-semibold",
                !active.value && "text-muted-foreground",
              )}
            >
              {active.value ? "Activa" : "Oculta"}
            </span>
          </label>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled}
              onClick={onRemove}
              aria-label="Eliminar esta presentación"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    />
  );
}
