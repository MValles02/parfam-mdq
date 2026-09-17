"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { precioArs } from "@/lib/catalogo";
import { useCarrito, useHidratado } from "@/lib/carrito";

/**
 * Subtotal + CTA a /checkout (design/Carrito.dc.html). La usan el drawer y
 * `/carrito`. El mockup dibuja el boton en negro, pero para esta fase se
 * decidio usar el token `--whatsapp` (verde, ver comentario en globals.css)
 * en vez de un hex hardcodeado (AGENTS.md).
 *
 * El checkout (nombre, telefono, mensaje de WhatsApp) es una pagina aparte
 * ya implementada en `/checkout` -- esto solo navega para alla, no manda
 * nada por su cuenta.
 */
export function ResumenCarrito({ onNavegar }: { onNavegar?: () => void }) {
  const hidratado = useHidratado();
  const items = useCarrito((estado) => estado.items);

  if (!hidratado || items.length === 0) return null;

  const subtotal = items
    .reduce((acc, i) => acc + Number(i.unitPriceArs) * i.qty, 0)
    .toFixed(2);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">Subtotal</span>
        <span className="text-3xl font-extrabold tracking-[-0.03em]">
          {precioArs(subtotal)}
        </span>
      </div>

      <Button
        asChild
        onClick={onNavegar}
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
