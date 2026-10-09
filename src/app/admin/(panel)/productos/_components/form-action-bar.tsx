"use client";

import Link from "next/link";
import { Eye, Loader2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductStatus } from "@/generated/prisma/enums";
import type { EditableProduct } from "@/lib/admin/products";
import { getProductPath } from "@/lib/store/links";
import { cn } from "@/lib/utils";
import { ADMIN_PRODUCTS_PATH } from "../paths";

/**
 * Sticky header of the product form: breadcrumb, title and status of the
 * saved product, the unsaved-changes hint, and the save actions. It stays
 * visible because the form extends beyond one screen.
 */
export function FormActionBar({
  product,
  isManual,
  isDirty,
  isSaving,
  isImportingReferencePicture,
  saveAction,
}: {
  /** Saved product, or null while creating one. */
  product: EditableProduct | null;
  /** Actions only show once the fields are on screen. */
  isManual: boolean;
  isDirty: boolean;
  isSaving: boolean;
  /** Saving waits for the reference-picture import, so it is disabled. */
  isImportingReferencePicture: boolean;
  saveAction: (status: ProductStatus) => void;
}) {
  const isPublished = product?.status === ProductStatus.PUBLISHED;
  const isSaveDisabled = isSaving || isImportingReferencePicture;

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur sm:px-8">
      {product ? (
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">
            <Link
              href={ADMIN_PRODUCTS_PATH}
              className="hover:text-foreground"
            >
              Productos
            </Link>
            {` / ${product.brand.name}`}
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="truncate text-xl font-extrabold tracking-tight">
              {product.name}
            </h1>
            <span
              className={cn(
                "rounded border px-2 py-0.5 text-xs font-semibold",
                isPublished
                  ? "border-success-border bg-success text-success-foreground"
                  : "border-border bg-muted text-muted-foreground",
              )}
            >
              {isPublished ? "Publicado" : "Borrador"}
            </span>
            {isDirty ? (
              <span className="text-xs text-muted-foreground">
                Cambios sin guardar
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">
          {isDirty ? "Cambios sin guardar" : ""}
        </span>
      )}

      {isManual ? (
        <div className="flex flex-wrap items-center gap-2.5">
          {product && isPublished ? (
            <Button type="button" variant="ghost" asChild>
              <Link
                href={getProductPath(product.slug)}
                target="_blank"
                rel="noreferrer noopener"
              >
                <Eye className="size-4" />
                Vista previa
              </Link>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={isSaveDisabled}
            onClick={() =>
              saveAction(
                isPublished ? ProductStatus.PUBLISHED : ProductStatus.DRAFT,
              )
            }
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Guardar
          </Button>
          {isPublished ? (
            <Button
              type="button"
              variant="ghost"
              disabled={isSaveDisabled}
              onClick={() => saveAction(ProductStatus.DRAFT)}
            >
              Pasar a borrador
            </Button>
          ) : (
            <Button
              type="button"
              disabled={isSaveDisabled}
              onClick={() => saveAction(ProductStatus.PUBLISHED)}
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Publicar
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
