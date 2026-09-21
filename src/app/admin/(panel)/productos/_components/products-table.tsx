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
import { formatArsPrice } from "@/lib/catalog";
import { formatRelativeDate } from "@/lib/date";
import type { ProductRow } from "@/lib/admin/products";
import { StatusChip, ActionMenu } from "./action-row";

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

function formatVariantCount(variantCount: number, activeVariantCount: number) {
  const variantSummary = `${variantCount} ${variantCount === 1 ? "variante" : "variantes"}`;
  if (activeVariantCount === variantCount) return variantSummary;
  return `${variantSummary} · ${activeVariantCount} ${activeVariantCount === 1 ? "activa" : "activas"}`;
}

export function ProductsTable({ rows }: { rows: ProductRow[] }) {
  return (
    <div className="overflow-hidden rounded border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60 hover:bg-muted/60">
            <TableHead className="w-16"></TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Producto
            </TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Estado
            </TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Variantes
            </TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Desde
            </TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Actualizado
            </TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Thumbnail
                  image={row.image?.url ?? null}
                  alt={row.image?.alt ?? row.name}
                />
              </TableCell>
              <TableCell>
                <Link
                  href={`/admin/productos/${row.id}`}
                  className="flex flex-col gap-0.5"
                >
                  <span className="text-sm font-semibold tracking-tight text-foreground">
                    {row.name}
                  </span>
                  <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    {row.brandName}
                  </span>
                </Link>
              </TableCell>
              <TableCell>
                <StatusChip
                  id={row.id}
                  isPublished={row.status === "PUBLISHED"}
                />
              </TableCell>
              <TableCell className="text-sm text-foreground">
                {formatVariantCount(row.variantCount, row.activeVariantCount)}
              </TableCell>
              <TableCell className="text-sm font-semibold text-foreground">
                {row.startingPrice ? formatArsPrice(row.startingPrice) : "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatRelativeDate(row.updatedAt)}
              </TableCell>
              <TableCell>
                <ActionMenu id={row.id} name={row.name} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
