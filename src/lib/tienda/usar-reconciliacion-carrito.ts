"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { validarCarritoAction } from "@/app/(tienda)/carrito/actions";
import { useCarrito, useHidratado } from "@/lib/carrito";
import type { RazonInvalido } from "@/lib/tienda/carrito-servidor";

/**
 * Reconciliación del carrito contra la base (trampa #3 de la Fase 5, ver
 * AGENTS.md): lo usan tanto `/carrito` como `/checkout`, así que vive acá y
 * no en un componente de una sola página.
 *
 * Dos casos, dos tratamientos:
 *   - Variante inactiva/eliminada/despublicada: se saca sola del carrito, con
 *     un toast explicando por qué. No hay nada que confirmar.
 *   - Precio distinto al que quedó guardado: se actualiza el carrito al
 *     precio real y se junta en `cambios` para que la pantalla se lo muestre
 *     al cliente y pida una confirmación explícita antes de dejarlo avanzar
 *     al pago (AGENTS.md pide "mostrar el nuevo y pedir confirmación antes
 *     de cerrar"). Esto es sólo cortesía de UX — el total real siempre lo
 *     recalcula `crearPedido` contra la base, nunca este chequeo.
 */

export type CambioPrecio = {
  variantId: string;
  productName: string;
  variantLabel: string;
  antes: string;
  ahora: string;
};

const MENSAJE_RAZON: Record<RazonInvalido, string> = {
  inactiva: "ya no está disponible",
  eliminada: "ya no existe",
  despublicado: "ya no está a la venta",
};

export function useReconciliacionCarrito() {
  const hidratado = useHidratado();
  const items = useCarrito((estado) => estado.items);
  const quitar = useCarrito((estado) => estado.quitar);
  const actualizarPrecio = useCarrito((estado) => estado.actualizarPrecio);
  const [cambios, setCambios] = useState<CambioPrecio[]>([]);
  // Se pone en true una sola vez, adentro del `.then()` de abajo -- nunca
  // sincronico en el cuerpo del efecto, que es lo que `react-hooks/set-state-in-effect`
  // (React 19, error y no warning) prohibe. `verificando` sale de derivar
  // este flag en el render, no de escribirlo directo desde el efecto.
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!hidratado || items.length === 0) return;

    let cancelado = false;

    validarCarritoAction(
      items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
    ).then((resultado) => {
      if (cancelado) return;

      const cambiosDetectados: CambioPrecio[] = [];
      for (const r of resultado) {
        const item = items.find((i) => i.variantId === r.variantId);
        if (!item) continue;

        if (!r.ok) {
          quitar(r.variantId);
          toast.error(`Sacamos "${item.productName}" del carrito`, {
            description: `${item.variantLabel} ${MENSAJE_RAZON[r.razon]}.`,
          });
          continue;
        }

        if (r.precioArs !== item.unitPriceArs) {
          cambiosDetectados.push({
            variantId: r.variantId,
            productName: item.productName,
            variantLabel: item.variantLabel,
            antes: item.unitPriceArs,
            ahora: r.precioArs,
          });
          actualizarPrecio(r.variantId, r.precioArs);
        }
      }
      if (cambiosDetectados.length > 0) setCambios(cambiosDetectados);
      setListo(true);
    });

    return () => {
      cancelado = true;
    };
    // Sólo se dispara al hidratar: si dependiera de `items`, cada +1/-1 del
    // stepper de cantidades repetiría el viaje a la base.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidratado]);

  return {
    cambios,
    descartarCambios: () => setCambios([]),
    verificando: hidratado && items.length > 0 && !listo,
  };
}
