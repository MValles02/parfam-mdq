import Image from "next/image";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SHORT_CONCENTRATION_LABELS, getVariantLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import type { ProductRow } from "@/lib/admin/products";
import { StatusChip, VisibleSwitch, ActionMenu } from "./action-row";

function Thumbnail({ image, alt }: { image: string | null; alt: string }) {
  if (image) {
    return (
      <div className="h-[58px] w-12 overflow-hidden rounded-sm border border-border bg-muted">
        <Image
          src={image}
          alt={alt}
          width={48}
          height={58}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex h-[58px] w-12 items-center justify-center rounded-sm border border-border bg-background">
      <svg
        width="26"
        height="42"
        viewBox="0 0 120 190"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="44"
          y="6"
          width="32"
          height="26"
          rx="3"
          className="fill-border"
        />
        <rect
          x="18"
          y="46"
          width="84"
          height="134"
          rx="4"
          className="fill-muted stroke-border"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}

/** "Decant 5 · 10 ml · Frasco entero", active presentations only. */
function formatPresentations(variants: ProductRow["variants"]) {
  const active = variants.filter((variant) => variant.isActive);
  const decantSizes = active
    .filter((variant) => variant.kind === "DECANT" && variant.sizeMl !== null)
    .map((variant) => variant.sizeMl);
  const parts: string[] = [];
  if (decantSizes.length > 0) {
    parts.push(`Decant ${decantSizes.join(" · ")} ml`);
  }
  for (const variant of active) {
    if (variant.kind === "DECANT" && variant.sizeMl !== null) continue;
    parts.push(getVariantLabel(variant.kind, variant.sizeMl));
  }
  return parts.length > 0 ? parts.join(" · ") : "Sin presentaciones activas";
}

/**
 * Completeness of the product sheet. Description and an active variant are
 * the publish rule; the primary photo is only a recommendation.
 */
function SheetCompleteness({ row }: { row: ProductRow }) {
  const checks = [
    { done: row.activeVariantCount > 0, missing: "presentación" },
    { done: row.hasDescription, missing: "descripción" },
    { done: row.hasPrimaryImage, missing: "foto" },
  ];
  const missing = checks.filter((check) => !check.done);

  return (
    <div className="flex min-w-28 flex-col gap-1.5">
      <div
        role="img"
        aria-label={`Ficha: ${checks.length - missing.length} de ${checks.length}`}
        className="flex gap-0.5"
      >
        {checks.map((check) => (
          <span
            key={check.missing}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              check.done ? "bg-success-foreground" : "bg-border",
            )}
          />
        ))}
      </div>
      <span
        className={cn(
          "text-xs",
          missing.length > 0
            ? "text-warning-foreground"
            : "text-muted-foreground",
        )}
      >
        {missing.length > 0
          ? `Falta ${missing.map((check) => check.missing).join(", ")}`
          : "Completa"}
      </span>
    </div>
  );
}

export function ProductsTable({ rows }: { rows: ProductRow[] }) {
  return (
    <div className="overflow-x-auto rounded border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60 hover:bg-muted/60">
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Producto
            </TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Presentaciones
            </TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Ficha
            </TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Estado
            </TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Visible
            </TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Thumbnail
                    image={row.image?.url ?? null}
                    alt={row.image?.alt ?? row.name}
                  />
                  <Link
                    href={`/admin/productos/${row.id}`}
                    className="flex flex-col gap-0.5"
                  >
                    <span className="text-sm font-semibold tracking-tight text-foreground">
                      {row.name}
                    </span>
                    <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                      {row.brandName}
                      {row.concentration
                        ? ` · ${SHORT_CONCENTRATION_LABELS[row.concentration]}`
                        : ""}
                    </span>
                  </Link>
                </div>
              </TableCell>
              <TableCell className="text-sm text-foreground">
                {formatPresentations(row.variants)}
              </TableCell>
              <TableCell>
                <SheetCompleteness row={row} />
              </TableCell>
              <TableCell>
                <StatusChip isPublished={row.status === "PUBLISHED"} />
              </TableCell>
              <TableCell>
                <VisibleSwitch
                  id={row.id}
                  name={row.name}
                  isPublished={row.status === "PUBLISHED"}
                />
              </TableCell>
              <TableCell>
                <ActionMenu id={row.id} name={row.name} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        Para publicar un producto hace falta al menos una presentación activa y
        la descripción. La foto es recomendada, no obligatoria.
      </p>
    </div>
  );
}
