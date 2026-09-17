"use client";

import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCantidadCarrito, useCarrito, useHidratado } from "@/lib/carrito";
import { ListaItems } from "@/components/tienda/carrito/lista-items";
import { ResumenCarrito } from "@/components/tienda/carrito/resumen-carrito";

/**
 * Contenido del drawer del carrito (design/Carrito.dc.html): header "Tu
 * pedido" + contador, lista de items y subtotal + CTA al pie.
 *
 * El `<Sheet>` que lo envuelve vive en `header.tsx`, no aca, porque tiene
 * DOS triggers -- el chip de desktop y el boton cuadrado de mobile -- que
 * tienen que abrir el mismo drawer compartido. `cerrar` es el
 * `setOpen(false)` de ese Sheet: lo necesitamos para cerrar el drawer al
 * navegar (a un producto, al catalogo o al checkout), porque el header
 * sigue montado entre paginas y el Sheet no se cierra solo.
 */
export function CarritoDrawer({ cerrar }: { cerrar: () => void }) {
  const hidratado = useHidratado();
  const cantidad = useCantidadCarrito();
  const items = useCarrito((estado) => estado.items);
  const etiqueta = cantidad === 1 ? "1 producto" : `${cantidad} productos`;

  return (
    <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[470px]">
      <SheetHeader className="flex-row items-baseline gap-2.5 space-y-0 border-b border-border px-7 py-6">
        <SheetTitle className="text-xl font-extrabold tracking-[-0.02em]">
          Tu pedido
        </SheetTitle>
        {hidratado && cantidad > 0 ? (
          <span className="text-[13px] text-muted-foreground">{etiqueta}</span>
        ) : null}
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-7 py-5">
        <ListaItems onNavegar={cerrar} />
      </div>

      {hidratado && items.length > 0 ? (
        <div className="border-t border-border px-7 py-6">
          <ResumenCarrito onNavegar={cerrar} />
        </div>
      ) : null}
    </SheetContent>
  );
}
