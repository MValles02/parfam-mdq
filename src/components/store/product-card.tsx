import Link from "next/link";
import type { ProductCardData } from "@/lib/store/queries";
import { formatArsPrice } from "@/lib/catalog";
import { ProductImage } from "@/components/store/product-image";

/**
 * Catalog cards receive all display-ready data from the store query. Only the
 * ARS price formatting is performed here.
 */
export function ProductCard({
  product,
  priority = false,
  headingLevel: Heading = "h2",
}: {
  product: ProductCardData;
  priority?: boolean;
  /**
   * This heading follows the level used by the containing catalog section.
   */
  headingLevel?: "h2" | "h3";
}) {
  return (
    <Link
      href={`/producto/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded border bg-card transition-colors hover:border-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="relative isolate h-[180px] border-b bg-background sm:h-[260px]">
        {product.badge ? (
          <span className="absolute top-3 left-3 z-10 rounded-md bg-primary px-2.5 py-1.5 text-[9px] leading-none font-bold tracking-[0.16em] text-primary-foreground">
            {product.badge}
          </span>
        ) : null}
        <ProductImage
          image={product.image}
          priority={priority}
          sizes="(min-width: 1024px) 25vw, 50vw"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5 sm:p-[18px]">
        <span className="text-[9px] font-bold tracking-[0.18em] text-muted-foreground uppercase sm:text-[10px]">
          {product.brandName}
        </span>
        <Heading className="text-sm leading-tight font-bold tracking-[-0.015em] sm:text-lg">
          {product.name}
        </Heading>
        {product.metadata ? (
          <p className="hidden text-xs text-muted-foreground sm:block">
            {product.metadata}
          </p>
        ) : null}

        <div className="mt-auto flex items-baseline gap-1.5 pt-2">
          {product.startingPrice ? (
            <>
              <span className="text-[10px] text-muted-foreground sm:text-[11px]">
                desde
              </span>
              <span className="text-base font-bold tracking-[-0.02em] sm:text-xl">
                {formatArsPrice(product.startingPrice)}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">
              Consultá el precio
            </span>
          )}
        </div>

        {product.sizes.length > 0 ? (
          <div className="hidden gap-1.5 pt-1 sm:flex">
            {product.sizes.map((size) => (
              <span
                key={size}
                className="rounded-md border px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground"
              >
                {size}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
