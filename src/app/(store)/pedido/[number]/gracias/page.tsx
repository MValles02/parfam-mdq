import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings";
import { isValidWhatsAppLink } from "@/lib/whatsapp";
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
  const [{ number }, sp, config] = await Promise.all([
    pageProps.params,
    pageProps.searchParams,
    getSiteSettings(),
  ]);
  // `?link=` is an external query string value. Trust it only when it is the
  // URL shape built by `buildWhatsAppLink`; see F-05 in docs/findings.md. Any
  // other value uses CustomerThanks' generic fallback as if no link arrived.
  const rawLink = typeof sp.link === "string" ? sp.link : null;
  const link = rawLink && isValidWhatsAppLink(rawLink) ? rawLink : null;

  return (
    <CustomerThanks
      number={number}
      link={link}
      whatsappNumber={config.whatsappNumber}
    />
  );
}
