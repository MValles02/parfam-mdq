"use client";

import { unitsLabel, useCartQuantity, useCart, useHydrated } from "@/lib/cart";
import { CartItemList } from "@/components/store/cart/cart-item-list";
import { CartTotalAnnouncer } from "@/components/store/cart/cart-total-announcer";
import { CartSummary } from "@/components/store/cart/cart-summary";

/**
 * Full-page cart surface that shares its item list and summary with the
 * drawer, so direct navigation retains the same cart behavior.
 */
export function CartContent() {
  const hydrated = useHydrated();
  const quantity = useCartQuantity();
  const items = useCart((state) => state.items);
  const productCountLabel = unitsLabel(quantity);

  return (
    <>
      <CartTotalAnnouncer />
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

      <div className="mt-7 flex flex-col gap-10 lg:grid lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="sr-only">Productos en tu carrito</h2>
          <CartItemList />
        </div>
        {hydrated && items.length > 0 ? (
          <div className="h-fit rounded border border-border bg-card p-6 max-lg:sticky max-lg:bottom-0 max-lg:z-30 max-lg:rounded-none max-lg:border-x-0 max-lg:border-b-0 max-lg:px-0 max-lg:pt-3 max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:sticky lg:top-24">
            <h2 className="sr-only">Resumen</h2>
            <CartSummary />
          </div>
        ) : null}
      </div>
    </>
  );
}
