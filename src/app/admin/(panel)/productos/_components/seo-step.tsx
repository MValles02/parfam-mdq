"use client";

import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Field } from "@/components/admin/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProductFormInput } from "@/lib/validations/product";
import { Step } from "./step";

/** Step 5 of the product form: public slug, source link, and SEO overrides. */
export function SeoStep({
  control,
  errors,
}: {
  control: Control<ProductFormInput>;
  errors: FieldErrors<ProductFormInput>;
}) {
  return (
    <Step
      number={5}
      title="SEO y enlace"
      description="Si los dejás vacíos, la tienda usa el nombre y la descripción del producto."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Dirección del producto"
          htmlFor="slug"
          error={errors.slug?.message}
          hint="Se arma sola con la marca y el nombre si la dejás vacía."
        >
          <Controller
            control={control}
            name="slug"
            render={({ field }) => (
              <div className="flex items-center rounded-md border bg-background pl-3 text-sm">
                <span className="shrink-0 text-muted-foreground">
                  /producto/
                </span>
                <Input
                  {...field}
                  id="slug"
                  value={field.value ?? ""}
                  placeholder="dior-sauvage-elixir"
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
              </div>
            )}
          />
        </Field>

        <Field
          label="Link de Fragrantica"
          htmlFor="sourceUrl"
          error={errors.sourceUrl?.message}
          hint="Referencia interna, por si hay que volver a mirar la ficha original."
        >
          <Controller
            control={control}
            name="sourceUrl"
            render={({ field }) => (
              <Input
                {...field}
                id="sourceUrl"
                value={field.value ?? ""}
                placeholder="https://www.fragrantica.com/perfume/…"
                className="bg-background"
              />
            )}
          />
        </Field>

        <Field
          label="Título SEO"
          htmlFor="seoTitle"
          error={errors.seoTitle?.message}
        >
          <Controller
            control={control}
            name="seoTitle"
            render={({ field }) => (
              <Input
                {...field}
                id="seoTitle"
                value={field.value ?? ""}
                className="bg-background"
              />
            )}
          />
        </Field>

        <Field
          label="Descripción SEO"
          htmlFor="seoDescription"
          error={errors.seoDescription?.message}
        >
          <Controller
            control={control}
            name="seoDescription"
            render={({ field }) => (
              <Textarea
                {...field}
                id="seoDescription"
                rows={2}
                value={field.value ?? ""}
                className="bg-background"
              />
            )}
          />
        </Field>
      </div>
    </Step>
  );
}
