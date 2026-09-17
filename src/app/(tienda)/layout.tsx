import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Footer } from "@/components/tienda/footer";
import { Header } from "@/components/tienda/header";
import { ThemeProvider } from "@/components/tienda/theme-provider";
import { Toaster } from "@/components/ui/sonner";

/**
 * Layout del storefront. `/catalogo`, `marca/`, `producto/` y `page.tsx` los
 * escribe otro agente en paralelo (ver tarea) -- esto solo los envuelve.
 *
 * El NuqsAdapter hoy solo esta montado en el layout del panel admin
 * (src/app/admin/(panel)/layout.tsx); los filtros del catalogo viven en la
 * URL (AGENTS.md), asi que hace falta montarlo tambien aca.
 *
 * El Toaster vivia solo en la ficha de producto (era el unico que mostraba
 * algo: "agregado al carrito"). Con el drawer del carrito usando toasts de
 * la reconciliacion contra la base en mas paginas (Fase 5), se sube aca.
 */
export default function TiendaLayout({ children }: LayoutProps<"/">) {
  return (
    <ThemeProvider>
      <NuqsAdapter>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster position="top-right" richColors />
      </NuqsAdapter>
    </ThemeProvider>
  );
}
