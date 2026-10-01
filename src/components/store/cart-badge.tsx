"use client";

import { ShoppingBag } from "lucide-react";
import { cartLabel, useCartQuantity } from "@/lib/cart";
import { cn } from "@/lib/utils";

/**
 * Cart unit indicator. The header wraps it in the sheet trigger and provides
 * the button's accessible name.
 */
export function CartBadge({
  variant = "chip",
  className,
}: {
  variant?: "chip" | "button";
  className?: string;
}) {
  const quantity = useCartQuantity();
  const label = cartLabel(quantity);

  if (variant === "button") {
    return (
      <span
        aria-hidden="true"
        title={label}
        className={cn(
          "relative flex size-[46px] shrink-0 items-center justify-center rounded border border-input bg-card",
          className,
        )}
      >
        <ShoppingBag className="size-[19px]" strokeWidth={1.6} />
        {quantity > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 flex size-[19px] items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground lg:text-[10px]"
          >
            {quantity}
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      title={label}
      className={cn(
        "flex items-center gap-2 rounded border border-input bg-card px-3.5 py-2",
        className,
      )}
    >
      <ShoppingBag className="size-[17px]" strokeWidth={1.6} />
      {quantity > 0 && (
        <span className="text-[13px] font-semibold">{quantity}</span>
      )}
    </span>
  );
}
