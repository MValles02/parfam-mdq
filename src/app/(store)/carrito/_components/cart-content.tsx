"use client";

import { useCartQuantity, useCart, useHydrated } from "@/lib/cart";
import { CartItemList } from "@/components/store/cart/cart-item-list";
import { CartSummary } from "@/components/store/cart/cart-summary";

/**
 * Full-page cart surface that shares its item list and summary with the
 * drawer, so direct navigation retains the same cart behavior.
 */
export function CartContent() {
  const hydrated = useHydrated();
  const quantity = useCartQuantity();
  const items = useCart((state) => state.items);
  const productCountLabel =
    quantity === 1 ? "1 producto" : `${quantity} productos`;

  return (
    <>
      <div className="flex items-baseline gap-2.5">
        <h1 className="text-[32px] font-extrabold tracking-[-0.025em]">
          Tu carrito
        </h1>
        {hydrated && quantity > 0 ? (
          <span className="text-sm text-muted-foreground">
            {productCountLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-7 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        <CartItemList />
        {hydrated && items.length > 0 ? (
          <div className="h-fit rounded border border-border bg-card p-6 lg:sticky lg:top-24">
            <CartSummary />
          </div>
        ) : null}
      </div>
    </>
  );
}
