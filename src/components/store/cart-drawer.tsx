"use client";

import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart, useCartQuantity, useHydrated } from "@/lib/cart";
import { CartItemList } from "@/components/store/cart/cart-item-list";
import { CartSummary } from "@/components/store/cart/cart-summary";

/**
 * Cart drawer content. Header owns its Sheet because both desktop and mobile
 * triggers must control the same drawer; the close callback closes it before
 * a navigation while the header remains mounted.
 */
export function CartDrawer({ close }: { close: () => void }) {
  const hydrated = useHydrated();
  const quantity = useCartQuantity();
  const items = useCart((state) => state.items);
  const label = quantity === 1 ? "1 producto" : `${quantity} productos`;

  return (
    <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[470px]">
      <SheetHeader className="flex-row items-baseline gap-2.5 space-y-0 border-b border-border px-7 py-6">
        <SheetTitle className="text-xl font-extrabold tracking-[-0.02em]">
          Tu pedido
        </SheetTitle>
        {hydrated && quantity > 0 ? (
          <span className="text-[13px] text-muted-foreground">{label}</span>
        ) : null}
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-7 py-5">
        <CartItemList onNavigate={close} />
      </div>

      {hydrated && items.length > 0 ? (
        <div className="border-t border-border px-7 py-6">
          <CartSummary onNavigate={close} />
        </div>
      ) : null}
    </SheetContent>
  );
}
