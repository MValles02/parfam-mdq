import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings";
import { CheckoutForm } from "./_components/checkout-form";

export const metadata: Metadata = { title: "Checkout" };

/**
 * The cart lives in `localStorage`, and `CheckoutForm` builds all of its
 * client-side content, including hydration; see `useHydrated`. The server
 * only provides `SiteSetting.shippingInfo`, which administrators can update
 * from `/admin/configuracion`.
 */
export default async function Page() {
  const config = await getSiteSettings();

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-16 lg:py-14">
      <CheckoutForm shippingInfo={config.shippingInfo} />
    </div>
  );
}
