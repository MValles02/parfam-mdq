import type { Metadata } from "next";
import { obtenerConfiguracionSitio } from "@/lib/configuracion";
import { FormularioCheckout } from "./_components/formulario-checkout";

export const metadata: Metadata = { title: "Checkout" };

/**
 * El carrito vive en `localStorage`: todo su contenido lo arma
 * `FormularioCheckout` en el cliente, hidratación incluida (ver
 * `useHidratado`). Lo único que sí trae el servidor es el texto de envío de
 * `SiteSetting.shippingInfo`, editable desde `/admin/configuracion`.
 */
export default async function Page() {
  const config = await obtenerConfiguracionSitio();

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-16 lg:py-14">
      <FormularioCheckout shippingInfo={config.shippingInfo} />
    </div>
  );
}
