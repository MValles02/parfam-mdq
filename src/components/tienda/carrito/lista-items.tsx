"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCarrito, useHidratado } from "@/lib/carrito";
import { useReconciliacionCarrito } from "@/lib/tienda/usar-reconciliacion-carrito";
import { ItemFila } from "@/components/tienda/carrito/item-fila";

/**
 * Lista de items del carrito, con el estado vacio y el renglon "Seguir
 * mirando el catalogo" (design/Carrito.dc.html). La usan tanto el drawer
 * (`carrito-drawer.tsx`) como `/carrito` para no duplicar la logica de
 * items/stepper -- por eso vive aca y no en ninguno de los dos.
 *
 * Tambien es donde se dispara `useReconciliacionCarrito()`: como es el unico
 * componente que ambos lugares montan siempre, alcanza con llamarlo una vez
 * aca para que la auto-limpieza corra en los dos casos.
 */
export function ListaItems({ onNavegar }: { onNavegar?: () => void }) {
  const hidratado = useHidratado();
  const items = useCarrito((estado) => estado.items);
  useReconciliacionCarrito();

  if (!hidratado) return null;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded border border-dashed border-border p-16 text-center">
        <p className="text-sm text-muted-foreground">
          Todavía no agregaste nada al carrito.
        </p>
        <Button asChild onClick={onNavegar}>
          <Link href="/catalogo">Ir al catálogo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {items.map((item) => (
        <ItemFila key={item.variantId} item={item} onNavegar={onNavegar} />
      ))}

      <Link
        href="/catalogo"
        onClick={onNavegar}
        className="rounded border border-dashed border-border p-4 text-center text-[13px] font-medium text-muted-foreground hover:border-foreground hover:text-foreground"
      >
        Seguir mirando el catálogo
      </Link>
    </div>
  );
}
