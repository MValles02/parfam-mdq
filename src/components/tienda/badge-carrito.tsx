"use client";

import { ShoppingBag } from "lucide-react";
import { useCantidadCarrito } from "@/lib/carrito";
import { cn } from "@/lib/utils";

/**
 * Indicador de unidades en el carrito (icono de bolsa + cantidad). No es un
 * link: `header.tsx` lo envuelve en un `<button>` (trigger del `<Sheet>` del
 * drawer, Fase 5) sin tocar este componente, asi que sigue siendo puramente
 * informativo puertas adentro.
 *
 * `variante="chip"` es el formato de la barra desktop (design/Main.dc.html);
 * `variante="boton"` es el cuadrado con el numero en un circulo, como en
 * design/HomeMobile.dc.html.
 */
export function BadgeCarrito({
  variante = "chip",
  className,
}: {
  variante?: "chip" | "boton";
  className?: string;
}) {
  const cantidad = useCantidadCarrito();
  const etiqueta =
    cantidad === 1 ? "Carrito: 1 unidad" : `Carrito: ${cantidad} unidades`;

  if (variante === "boton") {
    return (
      <span
        role="status"
        aria-label={etiqueta}
        title={etiqueta}
        className={cn(
          "relative flex size-[46px] shrink-0 items-center justify-center rounded border border-border bg-card",
          className,
        )}
      >
        <ShoppingBag className="size-[19px]" strokeWidth={1.6} />
        {cantidad > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 flex size-[19px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
          >
            {cantidad}
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-label={etiqueta}
      title={etiqueta}
      className={cn(
        "flex items-center gap-2 rounded border border-border bg-card px-3.5 py-2",
        className,
      )}
    >
      <ShoppingBag className="size-[17px]" strokeWidth={1.6} />
      {cantidad > 0 && (
        <span className="text-[13px] font-semibold">{cantidad}</span>
      )}
    </span>
  );
}
