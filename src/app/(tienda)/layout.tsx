import Script from "next/script";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Footer } from "@/components/tienda/footer";
import { Header } from "@/components/tienda/header";
import { Toaster } from "@/components/ui/sonner";
import { env } from "@/lib/env";

/**
 * Umami (self-hosted): las dos variables son opcionales (ver `src/lib/env.ts`
 * -- todavia no hay instancia en todos los entornos), así que sin ellas esto
 * no renderiza nada. Va en el layout de la tienda y no en el raíz para no
 * medir el uso del panel de admin, sólo tráfico real de clientes (ver F-17
 * en `docs/findings.md`: antes la plomería entera estaba, pero ningún
 * componente la usaba).
 */
function ScriptUmami() {
  if (!env.NEXT_PUBLIC_UMAMI_URL || !env.NEXT_PUBLIC_UMAMI_WEBSITE_ID) {
    return null;
  }
  return (
    <Script
      src={`${env.NEXT_PUBLIC_UMAMI_URL}/script.js`}
      data-website-id={env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
      strategy="afterInteractive"
    />
  );
}

/**
 * Layout del storefront. `/catalogo`, `marca/`, `producto/` y `page.tsx` los
 * escribe otro agente en paralelo (ver tarea) -- esto solo los envuelve.
 *
 * El NuqsAdapter hoy solo esta montado en el layout del panel admin
 * (src/app/admin/(panel)/layout.tsx); los filtros del catalogo viven en la
 * URL (AGENTS.md), asi que hace falta montarlo tambien aca.
 *
 * El Toaster va aca y no en una pagina suelta porque lo usan varias: el
 * "agregado al carrito" de la ficha y los avisos de la reconciliacion del
 * carrito contra la base (drawer, /carrito y /checkout).
 */
export default function TiendaLayout({ children }: LayoutProps<"/">) {
  return (
    <NuqsAdapter>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <Toaster position="top-right" richColors />
      <ScriptUmami />
    </NuqsAdapter>
  );
}
