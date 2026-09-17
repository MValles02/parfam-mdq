"use server";

import { z } from "zod";
import {
  revalidarItemsCarrito,
  type ItemRevalidado,
} from "@/lib/tienda/carrito-servidor";

/**
 * Acción pública (sin `requireAdmin`: la usa cualquier visitante desde el
 * drawer, /carrito y /checkout) que reconcilia el carrito de `localStorage`
 * contra la base. No escribe nada — sólo lee — así que no necesita rate
 * limit ni honeypot, a diferencia de `crearPedido` en checkout/actions.ts.
 */

const entradaSchema = z.array(
  z.object({
    variantId: z.string().min(1),
    qty: z.number().int().min(1).max(99),
  }),
);

export async function validarCarritoAction(
  items: unknown,
): Promise<ItemRevalidado[]> {
  const parseado = entradaSchema.safeParse(items);
  if (!parseado.success) return [];
  return revalidarItemsCarrito(parseado.data);
}
