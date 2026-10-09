import Link from "next/link";
import { getVariantLabel } from "@/lib/catalog";
import type { ProductRow } from "@/lib/admin/products";
import { StatusChip } from "./action-row";
import { VariantQuickEdit } from "./variant-quick-edit";

export function ProductCards({ rows }: { rows: ProductRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <article
          key={row.id}
          className="flex flex-col gap-3 rounded border bg-card p-3"
        >
          <Link
            href={`/admin/productos/${row.id}`}
            className="flex items-start justify-between gap-3"
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold tracking-tight">
                {row.name}
              </span>
              <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                {row.brandName}
              </span>
            </span>
            <StatusChip isPublished={row.status === "PUBLISHED"} />
          </Link>
          {/* Testers are going away, so the mobile cards do not edit them. */}
          {row.variants
            .filter((variant) => variant.kind !== "TESTER")
            .map((variant) => (
              <VariantQuickEdit
                key={variant.id}
                variantId={variant.id}
                productName={row.name}
                label={getVariantLabel(variant.kind, variant.sizeMl)}
                priceArs={variant.priceArs}
                isActive={variant.isActive}
              />
            ))}
        </article>
      ))}
    </div>
  );
}
