import { formatArsPrice } from "@/lib/catalog";

/**
 * Builds the WhatsApp message from the configurable
 * `SiteSetting.whatsappMessageTemplate`. The persisted template format uses
 * `{{marca}}`, `{{items}}`, `{{total}}`, `{{nombre}}`, and `{{numero}}`.
 * `{{items}}` is the only placeholder that expands to multiple lines.
 *
 * It accepts an already calculated subtotal instead of separate `unitPriceArs`
 * and `qty` values, avoiding duplicate Decimal multiplication after createOrder
 * has calculated database-backed totals.
 */

export type OrderMessageLine = {
  brandName: string;
  productName: string;
  variantLabel: string;
  qty: number;
  subtotalArs: string;
};

export function buildOrderMessage(params: {
  template: string;
  brand: string;
  customerName: string;
  orderNumber: string;
  items: OrderMessageLine[];
  totalArs: string;
}): string {
  const lines = params.items
    .map(
      (item) =>
        `• ${item.brandName} ${item.productName} — ${item.variantLabel} x${item.qty} — ${formatArsPrice(item.subtotalArs)}`,
    )
    .join("\n");

  return params.template
    .replaceAll("{{marca}}", params.brand)
    .replaceAll("{{items}}", lines)
    .replaceAll("{{total}}", formatArsPrice(params.totalArs))
    .replaceAll("{{nombre}}", params.customerName)
    .replaceAll("{{numero}}", params.orderNumber);
}
