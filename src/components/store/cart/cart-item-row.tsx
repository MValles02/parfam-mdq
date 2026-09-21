"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { formatArsPrice } from "@/lib/catalog";
import { useCart, type CartItem } from "@/lib/cart";

const MAX_QUANTITY = 99;

/**
 * Cart thumbnail with the same bottle fallback used by the admin table.
 */
function Thumbnail({ image, alt }: { image: string | null; alt: string }) {
  if (image) {
    return (
      <div className="h-24 w-[74px] shrink-0 overflow-hidden rounded-sm border border-border bg-muted">
        <Image
          src={image}
          alt={alt}
          width={74}
          height={96}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex h-24 w-[74px] shrink-0 items-center justify-center rounded-sm border border-border bg-background">
      <svg
        width="40"
        height="64"
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

/**
 * A cart row with image, brand, variant, quantity stepper, and line price.
 */
export function CartItemRow({
  item,
  onNavigate,
}: {
  item: CartItem;
  onNavigate?: () => void;
}) {
  const updateQuantity = useCart((state) => state.updateQuantity);
  const remove = useCart((state) => state.remove);
  const lineSubtotal = (Number(item.unitPriceArs) * item.qty).toFixed(2);

  return (
    <div className="flex gap-4 rounded border border-border bg-card p-3.5">
      <Link
        href={`/producto/${item.productSlug}`}
        onClick={onNavigate}
        className="shrink-0"
      >
        <Thumbnail image={item.image} alt={item.productName} />
      </Link>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
              {item.brandName}
            </span>
            <Link
              href={`/producto/${item.productSlug}`}
              onClick={onNavigate}
              className="text-[15px] leading-tight font-bold tracking-[-0.01em] hover:text-muted-foreground"
            >
              {item.productName}
            </Link>
            <span className="text-xs text-muted-foreground">
              {item.variantLabel}
            </span>
          </div>
          <button
            type="button"
            aria-label={`Quitar ${item.productName} del carrito`}
            onClick={() => remove(item.variantId)}
            className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center rounded border border-border bg-background">
            <button
              type="button"
              aria-label="Quitar una unidad"
              onClick={() => updateQuantity(item.variantId, item.qty - 1)}
              disabled={item.qty <= 1}
              className="p-2 text-muted-foreground disabled:opacity-40"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="min-w-[18px] text-center text-[13px] font-bold">
              {item.qty}
            </span>
            <button
              type="button"
              aria-label="Agregar una unidad"
              onClick={() => updateQuantity(item.variantId, item.qty + 1)}
              disabled={item.qty >= MAX_QUANTITY}
              className="p-2 disabled:opacity-40"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <span className="text-base font-bold tracking-[-0.02em]">
            {formatArsPrice(lineSubtotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
