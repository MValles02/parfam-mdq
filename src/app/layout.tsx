import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { siteDefaults } from "@/lib/site";
import { URL_SITIO } from "@/lib/seo";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Con metadataBase, las rutas relativas de openGraph/canonical se resuelven
  // solas contra el entorno donde corre (localhost en dev, el dominio real en
  // produccion).
  metadataBase: new URL(URL_SITIO),
  title: {
    default: `${siteDefaults.name} — ${siteDefaults.tagline}`,
    template: `%s — ${siteDefaults.name}`,
  },
  description: siteDefaults.description,
};

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
