import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings";
import { CheckoutForm } from "./_components/checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

/**
 * The cart lives in `localStorage`, and `CheckoutForm` builds all of its
 * client-side content, including hydration; see `useHydrated`. The server
 * only provides `SiteSetting.shippingInfo`, which administrators can update
 * from `/admin/configuracion`.
 */
export default async function Page() {
  const settings = await getSiteSettings();

  return (
    <div className="mx-auto max-w-page px-5 pt-10 pb-10 sm:px-8 lg:px-16 lg:pt-14 lg:pb-14">
      <CheckoutForm shippingInfo={settings.shippingInfo} />
    </div>
  );
}
