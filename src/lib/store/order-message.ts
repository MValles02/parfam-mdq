import { formatArsPrice } from "@/lib/catalog";

/**
 * Builds the WhatsApp message from the configurable
 * `SiteSetting.whatsappMessageTemplate`. The persisted template format uses
 * `{{marca}}`, `{{items}}`, `{{total}}`, `{{nombre}}`, and `{{numero}}`.
 * `{{items}}` is the only placeholder that expands to multiple lines.
 *
 * It accepts already calculated subtotal and total strings instead of
 * `unitPriceArs` and `qty`, so all Decimal arithmetic stays in createOrder and
 * this module only formats.
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
