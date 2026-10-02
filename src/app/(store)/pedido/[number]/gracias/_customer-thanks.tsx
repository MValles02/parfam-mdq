"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart, useHydrated } from "@/lib/cart";
import {
  buildWhatsAppLink,
  extractWhatsAppText,
  isValidWhatsAppLink,
} from "@/lib/whatsapp";

/**
 * `/pedido/[number]/gracias` is public and its order number is guessable:
 * "PM-0043" trivially follows "PM-0042". This page never queries the
 * database by `number`. It only uses the `link` that checkout stored in this
 * tab's sessionStorage (never in the URL, which would leak the customer's name
 * and order contents), so guessing an order number exposes no customer
 * details. Without the link (reload in a new tab, other device), every order
 * number receives the same fallback.
 *
 * The server renders the full shell (fallback WhatsApp button included) so the
 * page works without JS; after hydration the stored link replaces the button's
 * `href` and the recap card appears below the buttons.
 */
export function CustomerThanks({
  number,
  whatsappNumber,
  shippingInfo,
}: {
  /** Order number already checked against `^PM-\d+$`, or null if invalid. */
  number: string | null;
  /** `SiteSetting.whatsappNumber`, used by the fallback `href` below. */
  whatsappNumber: string;
  /** `SiteSetting.shippingInfo`; nothing is rendered when empty. */
  shippingInfo: string;
}) {
  const hydrated = useHydrated();
  const clear = useCart((state) => state.clear);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // preventScroll: the page is short and the jump would only be noise.
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    // The order already has its own OrderItem snapshot in the database, so
    // nothing remains to preserve in the cart. Keeping it would let a refresh
    // on /checkout submit the same order twice.
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // sessionStorage is client input: apply the same host check as any link.
  let link: string | null = null;
  if (hydrated && number) {
    try {
      const stored = sessionStorage.getItem(`whatsapp-link:${number}`);
      if (stored && isValidWhatsAppLink(stored)) link = stored;
    } catch {}
  }
  const message = link ? extractWhatsAppText(link) : null;

  // Checkout already opened the popup synchronously with the click. There is
  // no user gesture here, so retrying `window.open` automatically would be
  // blocked. The visible button provides a manual retry.
  const href =
    link ??
    buildWhatsAppLink(
      whatsappNumber,
      `¡Hola! Quería consultar por mi pedido${number ? ` ${number}` : ""}.`,
    );

  async function copyMessage() {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Mensaje copiado");
    } catch {
      toast.error(
        "No pudimos copiar el mensaje. Seleccionalo y copialo a mano.",
      );
    }
  }

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-6 px-5 py-24">
      <div>
        {number && (
          <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
            Pedido {number}
          </p>
        )}
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-2.5 text-3xl font-extrabold tracking-[-0.02em] outline-none"
        >
          {number
            ? `Tu pedido ${number} quedó guardado`
            : "Tu pedido quedó guardado"}
        </h1>
        <p className="mt-3.5 text-sm leading-relaxed text-muted-foreground">
          {link
            ? "Para confirmarlo, enviá el mensaje que se abrió en WhatsApp. Ahí coordinamos pago y entrega."
            : "Para confirmarlo, escribinos por WhatsApp con el botón de abajo. Ahí coordinamos pago y entrega."}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          asChild
          className="h-11 gap-3 bg-whatsapp px-8 text-base font-semibold text-whatsapp-foreground hover:bg-whatsapp/90"
        >
          <a href={href} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-5" />
            Abrir WhatsApp
          </a>
        </Button>
        <Button asChild variant="outline" className="h-11 px-8 text-base">
          <Link href="/#catalogo">Seguir viendo el catálogo</Link>
        </Button>
      </div>

      {shippingInfo && (
        <p className="text-sm leading-relaxed text-foreground/90">
          {shippingInfo}
        </p>
      )}

      {message && (
        <div className="flex flex-col gap-4 rounded border bg-card p-7">
          <span className="text-lg font-bold tracking-[-0.015em]">
            Tu mensaje
          </span>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message}
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-11 px-8"
            onClick={copyMessage}
          >
            Copiar mensaje
          </Button>
          <p className="text-xs text-muted-foreground">
            ¿No se abrió WhatsApp? Tocá el botón o copiá el mensaje.
          </p>
        </div>
      )}
    </div>
  );
}
