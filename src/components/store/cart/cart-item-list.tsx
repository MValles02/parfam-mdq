"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCart, useHydrated } from "@/lib/cart";
import { useCartReconciliation } from "@/lib/store/use-cart-reconciliation";
import { CartItemRow } from "@/components/store/cart/cart-item-row";

/**
 * Empty-cart placeholder shared by the drawer (/carrito preview) and the
 * standalone checkout page, which show it when the cart has no items.
 */
export function EmptyCart({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded border border-dashed border-border p-16 text-center">
      <p className="text-sm text-muted-foreground">
        Todavía no agregaste nada al carrito.
      </p>
      <Button asChild onClick={onNavigate} className="min-h-11 lg:min-h-0">
        <Link href="/catalogo">Ir al catálogo</Link>
      </Button>
    </div>
  );
}

/**
 * Renders cart items and the empty state for both the drawer and /carrito.
 * It owns the shared reconciliation trigger so either surface refreshes cart
 * availability exactly once.
 */
export function CartItemList({ onNavigate }: { onNavigate?: () => void }) {
  const hydrated = useHydrated();
  const items = useCart((state) => state.items);
  useCartReconciliation();

  if (!hydrated) return null;

  if (items.length === 0) {
    return <EmptyCart onNavigate={onNavigate} />;
  }

  return (
    <div className="flex flex-col gap-3.5">
      {items.map((item) => (
        <CartItemRow key={item.variantId} item={item} onNavigate={onNavigate} />
      ))}

      <Link
        href="/catalogo"
        onClick={onNavigate}
        className="rounded border border-dashed border-border p-4 text-center text-[13px] font-medium text-muted-foreground hover:border-foreground hover:text-foreground"
      >
        Seguir mirando el catálogo
      </Link>
    </div>
  );
}
