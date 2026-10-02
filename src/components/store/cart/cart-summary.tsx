"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatArsPrice } from "@/lib/catalog";
import { cartSubtotal, useCart, useHydrated } from "@/lib/cart";

/**
 * Cart subtotal and checkout CTA. The CTA only navigates to the checkout
 * form, so it uses the primary button, not the WhatsApp color.
 */
export function CartSummary({ onNavigate }: { onNavigate?: () => void }) {
  const hydrated = useHydrated();
  const items = useCart((state) => state.items);

  if (!hydrated || items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 lg:gap-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">Subtotal</span>
        <span className="text-2xl font-extrabold tracking-[-0.03em] lg:text-3xl">
          {formatArsPrice(cartSubtotal(items))}
        </span>
      </div>

      <Button
        asChild
        onClick={onNavigate}
        className="h-auto min-h-11 w-full py-3 text-[15px] font-semibold lg:py-5"
      >
        <Link href="/checkout">Continuar</Link>
      </Button>

      <p className="text-center text-[13px] leading-relaxed text-muted-foreground">
        No se cobra acá: acordamos pago y entrega por WhatsApp (Mar del Plata,
        envío o retiro)
      </p>
    </div>
  );
}
