import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings";
import { CustomerThanks } from "./_customer-thanks";

export const metadata: Metadata = { title: "Pedido enviado" };

/**
 * This page does not query the database by `number`; see
 * `_customer-thanks.tsx` for why it is not a trusted data source. The
 * WhatsApp number does come from cached settings so every caller uses the
 * same configured value rather than a static fallback.
 */
export default async function Page(
  pageProps: PageProps<"/pedido/[number]/gracias">,
) {
  const [{ number }, config] = await Promise.all([
    pageProps.params,
    getSiteSettings(),
  ]);

  return (
    <CustomerThanks number={number} whatsappNumber={config.whatsappNumber} />
  );
}
