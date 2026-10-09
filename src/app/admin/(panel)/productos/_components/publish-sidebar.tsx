"use client";

import { Controller, useWatch, type Control } from "react-hook-form";
import { ExternalLink, Loader2, Star } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { ProductFormInput } from "@/lib/validations/product";
import { cn } from "@/lib/utils";

/** In-page anchors; each id is set on the matching form section. */
const SECTION_LINKS = [
  ["#basicos", "Datos básicos"],
  ["#fotos", "Fotos"],
  ["#precios", "Precios"],
  ["#descripcion", "Descripción"],
  ["#perfil", "Perfil"],
  ["#mas-datos", "Más datos"],
] as const;

/**
 * Side column of the product form: the publish checklist, a storefront
 * summary, the "Destacado" switch, and section links.
 */
export function PublishSidebar({
  control,
  isImportingReferencePicture,
  referenceUrl,
}: {
  control: Control<ProductFormInput>;
  isImportingReferencePicture: boolean;
  /** Fragrantica page of the adopted reference, if any. */
  referenceUrl: string | null | undefined;
}) {
  // `useWatch` avoids React Compiler's incompatible-library bailout caused by
  // `form.watch`, whose returned function cannot be memoized.
  const brandName = useWatch({ control, name: "brandName" });
  const productName = useWatch({ control, name: "name" }) ?? "";
  const description = useWatch({ control, name: "description" }) ?? "";
  const variants = useWatch({ control, name: "variants" }) ?? [];
  const activeVariants = variants.filter((variant) => variant.isActive).length;

  // Mirrors the publish rule enforced by `productSchema` and
  // `changeProductStatus`: an active variant and a description.
  const checklist = [
    {
      label: "Nombre y marca",
      done: productName.trim() !== "" && Boolean(brandName?.trim()),
      href: "#basicos",
    },
    {
      label: "Una presentación activa",
      done: activeVariants > 0,
      href: "#precios",
    },
    {
      label: "Descripción",
      done: description.trim() !== "",
      href: "#descripcion",
    },
  ];

  return (
    <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
      <div className="flex flex-col gap-3 rounded-md border bg-card p-5">
        <h2 className="text-sm font-bold tracking-[-0.01em]">Para publicar</h2>
        <div
          role="img"
          aria-label={`Requisitos: ${checklist.filter((item) => item.done).length} de ${checklist.length}`}
          className="flex gap-0.5"
        >
          {checklist.map((item) => (
            <span
              key={item.label}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                item.done ? "bg-success-foreground" : "bg-border",
              )}
            />
          ))}
        </div>
        <ul className="flex flex-col gap-1.5 text-sm">
          {checklist.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className={cn(
                  "flex items-center gap-2",
                  item.done ? "text-foreground" : "text-warning-foreground",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    item.done
                      ? "bg-success-foreground"
                      : "bg-warning-foreground",
                  )}
                />
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          {description.length} caracteres de descripción
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-md border bg-card p-5 text-[13px] text-muted-foreground">
        <span>
          {variants.length === 0
            ? "Todavía no cargaste presentaciones."
            : `${activeVariants} de ${variants.length} ${variants.length === 1 ? "presentación se va" : "presentaciones se van"} a ver en la tienda`}
        </span>
        {isImportingReferencePicture ? (
          <span className="flex items-center gap-1.5 text-xs">
            <Loader2 className="size-3 animate-spin" />
            Trayendo la foto de referencia…
          </span>
        ) : null}
        {referenceUrl ? (
          <a
            href={referenceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-1 text-xs hover:text-foreground"
          >
            Ver la referencia en Fragrantica
            <ExternalLink className="size-3" />
          </a>
        ) : null}
        <Controller
          control={control}
          name="isFeatured"
          render={({ field }) => (
            <label className="flex cursor-pointer items-center gap-2.5">
              <Switch checked={field.value} onCheckedChange={field.onChange} />
              <span
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium",
                  !field.value && "text-muted-foreground",
                )}
              >
                <Star
                  className={cn("size-3.5", field.value && "fill-current")}
                />
                Destacado
              </span>
            </label>
          )}
        />
      </div>

      <nav
        aria-label="Secciones"
        className="flex flex-col gap-1 rounded-md border bg-card p-3 text-sm"
      >
        {SECTION_LINKS.map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="rounded px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
