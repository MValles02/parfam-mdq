import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings";
import { isOrderNumber } from "@/lib/whatsapp";
import { CustomerThanks } from "./_customer-thanks";

export const metadata: Metadata = {
  title: "Pedido guardado",
  robots: { index: false },
};

/**
 * This page does not query the database by `number`; see
 * `_customer-thanks.tsx` for why it is not a trusted data source. The
 * WhatsApp number and shipping info come from cached settings so every caller
 * uses the same configured value. The route param is public input: only a
 * `PM-<digits>` value is passed down, anything else is dropped.
 */
export default async function Page(
  pageProps: PageProps<"/pedido/[number]/gracias">,
) {
  const [{ number }, config] = await Promise.all([
    pageProps.params,
    getSiteSettings(),
  ]);

  return (
    <CustomerThanks
      number={isOrderNumber(number) ? number : null}
      whatsappNumber={config.whatsappNumber}
      shippingInfo={config.shippingInfo}
    />
  );
}
