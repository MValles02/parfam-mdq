import type { Metadata } from "next";
import Link from "next/link";
import { ContenidoCarrito } from "./_components/contenido-carrito";

export const metadata: Metadata = { title: "Carrito" };

/**
 * Igual que el drawer del carrito, pero como ruta para link directo.
 * El carrito vive en `localStorage`, asi que no hay
 * nada que traer del servidor aca -- todo lo arma `ContenidoCarrito` en el
 * cliente (mismo patron que `/checkout`, ver `checkout/page.tsx`).
 */
export default function Page() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-16">
      <p className="mb-6 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Inicio
        </Link>
        {" · Carrito"}
      </p>
      <ContenidoCarrito />
    </div>
  );
}
