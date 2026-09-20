import { ProductStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { etiquetaVariante } from "@/lib/catalogo";

/**
 * Revalidación del carrito contra la base: lo que hay en `localStorage` puede
 * tener variantes que el admin desactivó, productos despublicados, filas
 * borradas o precios viejos. Esto es lo único que puede decir qué hay
 * realmente disponible hoy.
 *
 * La usa la reconciliación silenciosa al entrar a /carrito o /checkout
 * (`useReconciliacionCarrito`, vía la Server Action de `carrito/actions.ts`)
 * para sacar lo inválido y actualizar precios. `crearPedido` no la llama:
 * hace su propia consulta contra `ProductVariant` antes de abrir la
 * transacción, y usa ese precio para el snapshot de `OrderItem`, porque ahí
 * no es por UX sino el único precio que vale (AGENTS.md: nunca confiar en el
 * que manda el cliente).
 */

export type RazonInvalido = "inactiva" | "eliminada" | "despublicado";

export type ItemRevalidado = {
  variantId: string;
  qty: number;
} & (
  | {
      ok: true;
      productId: string;
      productName: string;
      brandName: string;
      variantLabel: string;
      precioArs: string;
    }
  | { ok: false; razon: RazonInvalido }
);

/**
 * Trae el estado real de cada variante pedida. Una sola consulta para todos
 * los items — el carrito tiene a lo sumo unas pocas decenas de líneas.
 */
export async function revalidarItemsCarrito(
  items: { variantId: string; qty: number }[],
): Promise<ItemRevalidado[]> {
  if (items.length === 0) return [];

  const variantes = await prisma.productVariant.findMany({
    where: { id: { in: items.map((i) => i.variantId) } },
    select: {
      id: true,
      kind: true,
      sizeMl: true,
      priceArs: true,
      isActive: true,
      product: {
        select: {
          id: true,
          name: true,
          status: true,
          brand: { select: { name: true } },
        },
      },
    },
  });
  const porId = new Map(variantes.map((v) => [v.id, v]));

  return items.map((item) => {
    const v = porId.get(item.variantId);
    if (!v) return { ...item, ok: false, razon: "eliminada" };
    if (!v.isActive) return { ...item, ok: false, razon: "inactiva" };
    if (v.product.status !== ProductStatus.PUBLISHED)
      return { ...item, ok: false, razon: "despublicado" };
    return {
      ...item,
      ok: true,
      productId: v.product.id,
      productName: v.product.name,
      brandName: v.product.brand.name,
      variantLabel: etiquetaVariante(v.kind, v.sizeMl),
      precioArs: v.priceArs.toString(),
    };
  });
}
