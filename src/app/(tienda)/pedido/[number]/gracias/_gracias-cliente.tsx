"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MessageCircle, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCarrito, useHidratado } from "@/lib/carrito";
import { linkWhatsappA } from "@/lib/whatsapp";

/**
 * `/pedido/[number]/gracias` es una URL pública con un número adivinable
 * ("PM-0043" es trivialmente el siguiente de "PM-0042", AGENTS.md trampa #8).
 * La decisión: esta página **nunca consulta la base** por `number` — todo lo
 * que sabe sale del `link` que le pasa `/checkout` por query string, recién
 * generado. Así no hay nada que un tercero adivinando números de pedido
 * pueda sacar de acá (nombre, teléfono, items): sin el `link`, la página cae
 * al mismo mensaje genérico para cualquier número, exista o no el pedido.
 */
export function GraciasCliente({
  numero,
  link,
  whatsappNumber,
}: {
  numero: string;
  link: string | null;
  /** `SiteSetting.whatsappNumber`, para el fallback de abajo (ver `href`). */
  whatsappNumber: string;
}) {
  const hidratado = useHidratado();
  const vaciar = useCarrito((estado) => estado.vaciar);

  useEffect(() => {
    if (!hidratado) return;
    // El pedido ya quedó guardado en la base con su propio snapshot
    // (OrderItem): no hay nada más que conservar en el carrito. Si no lo
    // vaciáramos, un F5 en /checkout mandaría el mismo pedido dos veces.
    vaciar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidratado]);

  if (!hidratado) return null;

  // El popup ya se intentó abrir sincrónico con el click en /checkout
  // (AGENTS.md trampa #1): acá no hay gesto del usuario todavía, así que
  // reintentar un window.open automático se bloquearía seguro. Lo que
  // corresponde es un botón bien visible para el reintento manual.
  const href =
    link ??
    linkWhatsappA(whatsappNumber, "¡Hola! Quería consultar por mi pedido.");

  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center gap-6 px-5 py-24 text-center">
      <PartyPopper className="size-10" strokeWidth={1.5} />
      <div className="flex flex-col gap-2.5">
        <h1 className="text-3xl font-extrabold tracking-[-0.02em]">
          ¡Pedido {numero} armado!
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
