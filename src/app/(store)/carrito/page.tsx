import type { Metadata } from "next";
import Link from "next/link";
import { CartContent } from "./_components/cart-content";

export const metadata: Metadata = { title: "Carrito" };

/**
 * Matches the cart drawer but provides a direct-link route. The cart lives in
 * `localStorage`, so the server has nothing to load; `CartContent` builds it
 * on the client (the same pattern used by `/checkout`; see `checkout/page.tsx`).
 */
export default function Page() {
  return (
    <div className="mx-auto max-w-page px-5 py-10 sm:px-8 lg:px-16">
      <p className="mb-6 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Inicio
        </Link>
        {" · Carrito"}
      </p>
      <CartContent />
    </div>
  );
}
