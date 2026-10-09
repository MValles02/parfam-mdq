"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Check, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart, useHydrated } from "@/lib/cart";
import {
  buildWhatsAppLink,
  extractWhatsAppText,
  isValidWhatsAppLink,
  whatsAppLinkStorageKey,
} from "@/lib/whatsapp";

/**
 * Reads the wa.me link checkout stored for this order in this tab.
 * sessionStorage is client input, so it gets the same host check as any
 * link; unavailable storage or a tampered value yields null.
 */
function readStoredLink(orderNumber: string): string | null {
  try {
    const stored = sessionStorage.getItem(whatsAppLinkStorageKey(orderNumber));
    if (stored && isValidWhatsAppLink(stored)) return stored;
  } catch {}
  return null;
}

function fallbackMessage(orderNumber: string | null): string {
  return `¡Hola! Quería consultar por mi pedido${orderNumber ? ` ${orderNumber}` : ""}.`;
}

/** The decoded order message with a manual copy fallback. */
function MessageRecap({ message }: { message: string }) {
  async function copyMessage() {
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
    <div className="flex flex-col gap-4 rounded border bg-card p-6">
      <span className="text-lg font-bold tracking-[-0.015em]">Tu mensaje</span>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
      <Button
        type="button"
        variant="outline"
        className="h-11 px-8"
        onClick={copyMessage}
      >
        Copiar mensaje
      </Button>
    </div>
  );
}

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
  /** `SiteSetting.shippingInfo`; a generic line is shown when empty. */
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

  const link = hydrated && number ? readStoredLink(number) : null;
  const message = link ? extractWhatsAppText(link) : null;

  // Checkout already opened the popup synchronously with the click. There is
  // no user gesture here, so retrying `window.open` automatically would be
  // blocked. The visible button provides a manual retry.
  const href =
    link ?? buildWhatsAppLink(whatsappNumber, fallbackMessage(number));

  async function copyNumber() {
    if (!number) return;
    try {
      await navigator.clipboard.writeText(number);
      toast.success("Número copiado");
    } catch {
      toast.error(
        "No pudimos copiar el número. Seleccionalo y copialo a mano.",
      );
    }
  }

  const nextSteps = [
    ["Pedido guardado", "Quedó registrado con los precios de hoy."],
    [
      "Te confirmamos por WhatsApp",
      "Revisamos disponibilidad y te respondemos.",
    ],
    ["Pago y entrega", shippingInfo || "Lo coordinamos por chat."],
  ];

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-6 px-5 py-12 lg:py-20">
      <div className="flex flex-col items-center gap-4 text-center">
        <span
          aria-hidden
          className="flex size-14 items-center justify-center rounded-full border border-success-border bg-success text-success-foreground"
        >
          <Check className="size-7" />
        </span>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-3xl font-extrabold tracking-[-0.02em] outline-none"
        >
          ¡Listo! Tu pedido quedó guardado.
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {link
            ? "Mandanos el mensaje por WhatsApp y seguimos por ahí."
            : "Escribinos por WhatsApp con el botón de abajo y seguimos por ahí."}
        </p>
      </div>

      {number && (
        <div className="flex items-center justify-between gap-3 rounded border bg-card p-4">
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-muted-foreground">
              Número de pedido
            </span>
            <span className="text-xl font-extrabold tracking-[-0.02em] tabular-nums">
              {number}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0 gap-2"
            onClick={copyNumber}
          >
            <Copy className="size-4" />
            Copiar
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button
          asChild
          className="h-12 gap-3 bg-whatsapp px-8 text-base font-semibold text-whatsapp-foreground hover:bg-whatsapp/90"
        >
          <a href={href} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-5" />
            {link ? "Abrir WhatsApp de nuevo" : "Abrir WhatsApp"}
          </a>
        </Button>
        {link && (
          <p className="text-center text-sm text-muted-foreground">
            ¿No se abrió? Tocá el botón. El mensaje ya está escrito.
          </p>
        )}
      </div>

      <section className="flex flex-col gap-4 rounded border bg-card p-6">
        <h2 className="text-lg font-bold tracking-[-0.015em]">Qué sigue</h2>
        <ol className="flex flex-col gap-4">
          {nextSteps.map(([title, text], index) => (
            <li key={title} className="flex gap-3">
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold"
              >
                {index + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">{title}</span>
                <span className="text-sm text-muted-foreground">{text}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {message && <MessageRecap message={message} />}

      <Button asChild variant="outline" className="h-12 px-8 text-base">
        <Link href="/">Seguir viendo fragancias</Link>
      </Button>
    </div>
  );
}
