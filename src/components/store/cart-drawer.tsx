"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn, FOCUS_VISIBLE } from "@/lib/utils";
import { unitsLabel, useCart, useCartQuantity, useHydrated } from "@/lib/cart";
import { CartItemList } from "@/components/store/cart/cart-item-list";
import { CartTotalAnnouncer } from "@/components/store/cart/cart-total-announcer";
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
  const label = unitsLabel(quantity);

  return (
    <SheetContent
      showCloseButton={false}
      // The toaster lives outside the dialog, so tapping a toast action (e.g.
      // "Deshacer" after removing a line) would count as an outside click and
      // close the drawer.
      onInteractOutside={(event) => {
        if ((event.target as Element).closest("[data-sonner-toaster]"))
          event.preventDefault();
      }}
      className="flex flex-col gap-0 p-0 data-[side=right]:w-full sm:max-w-[470px]"
    >
      <SheetHeader className="flex-row items-baseline gap-2.5 space-y-0 border-b border-border px-7 py-6">
        <SheetTitle className="text-xl font-extrabold tracking-[-0.02em]">
          Tu pedido
        </SheetTitle>
        {hydrated && quantity > 0 ? (
          <span className="text-[13px] text-muted-foreground">{label}</span>
        ) : null}
      </SheetHeader>

      <CartTotalAnnouncer />
      <div className="flex-1 overflow-y-auto px-7 py-5">
        <CartItemList onNavigate={close} />
      </div>

      {hydrated && items.length > 0 ? (
        <div className="border-t border-border px-7 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <CartSummary onNavigate={close} />
        </div>
      ) : null}
      <SheetClose asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            "absolute top-1 right-1 size-11 lg:top-3 lg:right-3 lg:size-7",
            FOCUS_VISIBLE,
          )}
        >
          <XIcon />
          <span className="sr-only">Cerrar</span>
        </Button>
      </SheetClose>
    </SheetContent>
  );
}
