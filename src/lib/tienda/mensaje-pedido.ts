import { precioArs } from "@/lib/catalogo";

/**
 * Arma el mensaje de WhatsApp desde la plantilla configurable de
 * `SiteSetting.whatsappMessageTemplate` (ver AGENTS.md — el formato real
 * tiene `{{marca}}`, `{{items}}`, `{{total}}`, `{{nombre}}` y `{{numero}}`).
 * `{{items}}` es el único placeholder que expande a varias líneas; el
 * formato de cada línea lo define esta función.
 *
 * Recibe el subtotal ya calculado (no `unitPriceArs` + `qty` sueltos) para no
 * repetir la multiplicación Decimal que ya hizo `crearPedido` contra la base.
 */

export type LineaPedido = {
  brandName: string;
  productName: string;
  variantLabel: string;
  qty: number;
  subtotalArs: string;
};

export function armarMensajePedido(params: {
  plantilla: string;
  marca: string;
  nombre: string;
  numero: string;
  items: LineaPedido[];
  totalArs: string;
}): string {
  const lineas = params.items
    .map(
      (i) =>
        `• ${i.brandName} ${i.productName} — ${i.variantLabel} x${i.qty} — ${precioArs(i.subtotalArs)}`,
    )
    .join("\n");

  return params.plantilla
    .replaceAll("{{marca}}", params.marca)
    .replaceAll("{{items}}", lineas)
    .replaceAll("{{total}}", precioArs(params.totalArs))
    .replaceAll("{{nombre}}", params.nombre)
    .replaceAll("{{numero}}", params.numero);
}
