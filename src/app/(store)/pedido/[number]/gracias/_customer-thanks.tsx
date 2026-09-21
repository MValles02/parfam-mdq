"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MessageCircle, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, useHydrated } from "@/lib/cart";
import { buildWhatsAppLink } from "@/lib/whatsapp";

/**
 * `/pedido/[number]/gracias` is public and its order number is guessable:
 * "PM-0043" trivially follows "PM-0042". This page never queries the
 * database by `number`. It only uses the newly generated `link` from the
 * `/checkout` query string, so guessing an order number exposes no customer
 * details. Without the link, every order number receives the same fallback.
 */
export function CustomerThanks({
  number,
  link,
  whatsappNumber,
}: {
  number: string;
  link: string | null;
  /** `SiteSetting.whatsappNumber`, used by the fallback `href` below. */
  whatsappNumber: string;
}) {
  const hydrated = useHydrated();
  const clear = useCart((state) => state.clear);

  useEffect(() => {
    if (!hydrated) return;
    // The order already has its own OrderItem snapshot in the database, so
    // nothing remains to preserve in the cart. Keeping it would let a refresh
    // on /checkout submit the same order twice.
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  if (!hydrated) return null;

  // Checkout already opened the popup synchronously with the click. There is
  // no user gesture here, so retrying `window.open` automatically would be
  // blocked. The visible button provides a manual retry.
  const href =
    link ??
    buildWhatsAppLink(whatsappNumber, "¡Hola! Quería consultar por mi pedido.");

  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center gap-6 px-5 py-24 text-center">
      <PartyPopper className="size-10" strokeWidth={1.5} />
      <div className="flex flex-col gap-2.5">
        <h1 className="text-3xl font-extrabold tracking-[-0.02em]">
          ¡Pedido {number} armado!
        </h1>
        <p className="text-sm text-muted-foreground">
          {link
            ? "Si el chat de WhatsApp no se abrió solo, tocá el botón."
            : "Guardamos tu pedido. Escribinos por WhatsApp para coordinar el resto."}
        </p>
      </div>
      <Button
        asChild
        className="h-auto gap-3 bg-whatsapp px-8 py-4 text-base font-semibold text-whatsapp-foreground hover:bg-whatsapp/90"
      >
        <a href={href} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="size-5" />
          Abrir WhatsApp
        </a>
      </Button>
      <Link
        href="/catalogo"
        className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Seguir viendo el catálogo
      </Link>
    </div>
  );
}
