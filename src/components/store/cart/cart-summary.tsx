"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatArsPrice } from "@/lib/catalog";
import { useCart, useHydrated } from "@/lib/cart";

/**
 * Cart subtotal and checkout CTA. It uses the WhatsApp design token instead
 * of a hardcoded color and only navigates to checkout.
 */
export function CartSummary({ onNavigate }: { onNavigate?: () => void }) {
  const hydrated = useHydrated();
  const items = useCart((state) => state.items);

  if (!hydrated || items.length === 0) return null;

  const cartSubtotal = items
    .reduce((acc, i) => acc + Number(i.unitPriceArs) * i.qty, 0)
    .toFixed(2);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">Subtotal</span>
        <span className="text-3xl font-extrabold tracking-[-0.03em]">
          {formatArsPrice(cartSubtotal)}
        </span>
      </div>

      <Button
        asChild
        onClick={onNavigate}
        className="h-auto w-full gap-2.5 bg-whatsapp py-5 text-[15px] font-semibold text-whatsapp-foreground hover:bg-whatsapp/90"
      >
        <Link href="/checkout">
          <MessageCircle className="size-[18px]" />
          Finalizar pedido por WhatsApp
        </Link>
      </Button>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        Te pedimos nombre y teléfono, y se abre el chat con el pedido ya
        escrito.
      </p>
    </div>
  );
}
