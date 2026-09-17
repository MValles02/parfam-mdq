import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { obtenerConfiguracionSitio } from "@/lib/configuracion";
import { URL_SITIO } from "@/lib/seo";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

/**
 * `brandName`/`seoDefaultTitle`/`seoDefaultDescription` salen de
 * `SiteSetting` (editable desde `/admin/configuracion`, Fase 6) en vez de
 * `siteDefaults`: son el título/descripción por defecto de TODO el sitio
 * (el template de acá envuelve cualquier página que no ponga el suyo
 * propio), así que es la única fuente que tiene sentido acá.
 */
export async function generateMetadata(): Promise<Metadata> {
  const config = await obtenerConfiguracionSitio();

  return {
    // Con metadataBase, las rutas relativas de openGraph/canonical se
    // resuelven solas contra el entorno donde corre (localhost en dev, el
    // dominio real en produccion).
    metadataBase: new URL(URL_SITIO),
    title: {
      default: config.seoDefaultTitle,
      template: `%s — ${config.brandName}`,
    },
    description: config.seoDefaultDescription,
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: next-themes escribe la clase del tema en <html>
    // antes de que React hidrate, asi que el atributo difiere del HTML del
    // servidor a proposito. Va solo en este nodo, no en el arbol entero.
    <html
      lang="es-AR"
      suppressHydrationWarning
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
