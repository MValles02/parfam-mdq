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
import { PRESENTACION } from "@/lib/catalogo";
import type { ProductoFormInput } from "@/lib/validations/producto";
import { cn } from "@/lib/utils";

const COLUMNAS = "grid-cols-[1.4fr_0.8fr_1.2fr_1fr_1fr_60px]";

/** Tamaños típicos de cada presentación, sólo como sugerencia del datalist. */
const SUGERENCIAS_ML: Record<VariantKind, number[]> = {
  FULL_BOTTLE: [30, 50, 100, 125, 200],
  TESTER: [50, 100, 125],
  DECANT: [2, 3, 5, 10, 15],
};

export function EditorVariantes({
  control,
  disabled,
  errorGeneral,
}: {
  control: Control<ProductoFormInput>;
  disabled?: boolean;
  errorGeneral?: string;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
  });
  // `useId` y no el `field.id` de useFieldArray: ese es un UUID nuevo en cada
  // render, asi que el `list=` del servidor no coincidia con el del cliente y
  // React tiraba un error de hidratacion (invisible en el build, visible en
  // la consola del navegador).
  const idDatalist = useId();

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className={cn(
          "hidden gap-3.5 px-3.5 pb-1 md:grid",
          COLUMNAS,
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

      {fields.map((field, i) => (
        <FilaVariante
          key={field.id}
          control={control}
          indice={i}
          idDatalist={idDatalist}
          disabled={disabled}
          onEliminar={() => remove(i)}
        />
      ))}

      {/* Un datalist por presentacion, renderizado una sola vez: sugerir
          "100 ml" para un decant o "3 ml" para un frasco no ayuda a nadie. */}
      {Object.entries(SUGERENCIAS_ML).map(([kind, tamanios]) => (
        <datalist key={kind} id={`${idDatalist}-${kind}`}>
          {tamanios.map((v) => (
            <option key={v} value={v} />
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
 * Una fila del editor. Va aparte porque necesita `useWatch` para saber su
 * propio tipo (y con eso elegir que sugerencias de tamanio mostrar), y los
 * hooks no pueden llamarse adentro del callback de un `.map()`.
 */
function FilaVariante({
  control,
  indice,
  idDatalist,
  disabled,
  onEliminar,
}: {
  control: Control<ProductoFormInput>;
  indice: number;
  idDatalist: string;
  disabled?: boolean;
  onEliminar: () => void;
}) {
  const tipoDeFila = useWatch({ control, name: `variants.${indice}.kind` });

  return (
    <Controller
      control={control}
      name={`variants.${indice}.isActive`}
      render={({ field: activa }) => (
        <div
          className={cn(
            "grid items-center gap-3.5 rounded-md border p-3 md:p-3.5",
            COLUMNAS.replace("grid-cols-", "md:grid-cols-"),
            "grid-cols-2",
            activa.value ? "bg-background" : "bg-secondary/60",
          )}
        >
          <Controller
            control={control}
            name={`variants.${indice}.kind`}
            render={({ field: tipo }) => (
              <Select
                value={tipo.value}
                onValueChange={tipo.onChange}
                disabled={disabled}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(VariantKind).map((k) => (
                    <SelectItem key={k} value={k}>
                      {PRESENTACION[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />

          <Controller
            control={control}
            name={`variants.${indice}.sizeMl`}
            render={({ field: ml, fieldState }) => (
              <div className="flex flex-col gap-1">
                <div className="relative">
                  <Input
                    inputMode="numeric"
                    placeholder="ml"
                    aria-label="Tamaño en mililitros"
                    list={`${idDatalist}-${tipoDeFila}`}
                    disabled={disabled}
                    className="bg-background pr-8"
                    value={ml.value ?? ""}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      // Vacío es "sin dato" (un decant sin tamaño fijo),
                      // no cero: por eso null y no Number("").
                      ml.onChange(v === "" ? null : Number(v));
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
            name={`variants.${indice}.priceArs`}
            render={({ field: precio, fieldState }) => (
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
                    value={precio.value ?? ""}
                    onChange={(e) => precio.onChange(e.target.value)}
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
            name={`variants.${indice}.sku`}
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
              checked={activa.value ?? true}
              onCheckedChange={activa.onChange}
              disabled={disabled}
            />
            <span
              className={cn(
                "text-xs font-semibold",
                !activa.value && "text-muted-foreground",
              )}
            >
              {activa.value ? "Activa" : "Oculta"}
            </span>
          </label>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled}
              onClick={() => onEliminar()}
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
