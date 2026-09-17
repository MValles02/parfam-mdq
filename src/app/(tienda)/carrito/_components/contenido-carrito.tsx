"use client";

import { useCantidadCarrito, useCarrito, useHidratado } from "@/lib/carrito";
import { ListaItems } from "@/components/tienda/carrito/lista-items";
import { ResumenCarrito } from "@/components/tienda/carrito/resumen-carrito";

/**
 * Misma informacion que el drawer del carrito (`carrito-drawer.tsx`) pero
 * como pagina completa, para link directo (AGENTS.md, Fase 5). No duplica
 * la logica de items/stepper/subtotal: usa los mismos componentes
 * compartidos `ListaItems`/`ResumenCarrito` (`src/components/tienda/carrito/`).
 */
export function ContenidoCarrito() {
  const hidratado = useHidratado();
  const cantidad = useCantidadCarrito();
  const items = useCarrito((estado) => estado.items);
  const etiqueta = cantidad === 1 ? "1 producto" : `${cantidad} productos`;

  return (
    <>
      <div className="flex items-baseline gap-2.5">
        <h1 className="text-[32px] font-extrabold tracking-[-0.025em]">
          Tu carrito
        </h1>
        {hidratado && cantidad > 0 ? (
          <span className="text-sm text-muted-foreground">{etiqueta}</span>
        ) : null}
      </div>

      <div className="mt-7 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        <ListaItems />
        {hidratado && items.length > 0 ? (
          <div className="h-fit rounded border border-border bg-card p-6 lg:sticky lg:top-24">
            <ResumenCarrito />
          </div>
        ) : null}
      </div>
    </>
  );
}
