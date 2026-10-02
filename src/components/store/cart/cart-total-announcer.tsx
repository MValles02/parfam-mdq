"use client";

import { formatArsPrice } from "@/lib/catalog";
import { cartSubtotal, useCart, useHydrated } from "@/lib/cart";

/**
 * Polite screen-reader announcement of the cart total. The live region is
 * always mounted (empty until there is a total) so later changes are announced
 * instead of the region appearing together with its content.
 */
export function CartTotalAnnouncer() {
  const hydrated = useHydrated();
  const items = useCart((state) => state.items);
  const text =
    hydrated && items.length > 0
      ? `Total: ${formatArsPrice(cartSubtotal(items))}`
      : "";

  return (
    <p aria-live="polite" className="sr-only">
      {text}
    </p>
  );
}
