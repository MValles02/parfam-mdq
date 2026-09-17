import type { Metadata } from "next";
import { FormularioCheckout } from "./_components/formulario-checkout";

export const metadata: Metadata = { title: "Checkout" };

/**
 * El carrito vive en `localStorage`, así que no hay nada que traer del
 * servidor acá: todo el contenido lo arma `FormularioCheckout` en el
 * cliente, hidratación incluida (ver `useHidratado`, AGENTS.md trampa #4).
 */
export default function Page() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-16 lg:py-14">
      <FormularioCheckout />
    </div>
  );
}
