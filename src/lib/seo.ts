import type { Metadata } from "next";
import { env } from "@/lib/env";
import { siteDefaults } from "@/lib/site";
import { GENERO, PRESENTACION } from "@/lib/catalogo";
import type { ProductoPublico } from "@/lib/tienda/consultas";

/**
 * Helpers de SEO compartidos por las paginas de la tienda.
 *
 * La URL del sitio sale de NEXT_PUBLIC_SITE_URL (validada en src/lib/env.ts) y
 * no de siteDefaults: en local es http://localhost:3000 y los canonical tienen
 * que apuntar al entorno donde corre, no siempre a produccion.
 */

export const URL_SITIO = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

export function urlAbsoluta(ruta: string): string {
  return `${URL_SITIO}${ruta.startsWith("/") ? ruta : `/${ruta}`}`;
}

/**
 * Metadata con canonical y Open Graph, que es lo que repite cada pagina.
 *
 * A proposito no setea `openGraph.images`: la imagen la ponen los archivos
 * `opengraph-image.tsx` (convencion de Next). Si una pagina la declarara acá,
 * la explicita gana y la generada nunca se usaria -- y la generada es la que
 * tiene la marca y sale en 1200x630, mientras que las fotos de producto son
 * verticales y las redes las recortan mal.
 */
export function metadataDePagina(opciones: {
  titulo: string;
  descripcion: string;
  ruta: string;
}): Metadata {
  const url = urlAbsoluta(opciones.ruta);
  return {
    title: opciones.titulo,
    description: opciones.descripcion,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: siteDefaults.name,
      locale: "es_AR",
      title: opciones.titulo,
      description: opciones.descripcion,
    },
    twitter: { card: "summary_large_image" },
  };
}

/**
 * Serializa JSON-LD para meterlo en un <script>. El `<` escapado es lo que
 * evita que un texto del admin con HTML adentro cierre el script y se
 * convierta en XSS (ver node_modules/next/dist/docs/01-app/02-guides/json-ld.md).
 */
export function jsonLd(dato: unknown): string {
  return JSON.stringify(dato).replace(/</g, "\\u003c");
}

/**
 * Product + AggregateOffer para la ficha. Los precios salen de las variantes
 * activas, que son las unicas que se pueden comprar; si no hay ninguna, no se
 * publica oferta en vez de inventar un precio.
 */
export function productoJsonLd(
  producto: ProductoPublico,
  urlImagenes: string[],
) {
  const precios = producto.variantes.map((v) => Number(v.precio));
  const url = urlAbsoluta(`/producto/${producto.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: producto.nombre,
    url,
    ...(producto.descripcion ? { description: producto.descripcion } : {}),
    ...(urlImagenes.length > 0 ? { image: urlImagenes } : {}),
    brand: { "@type": "Brand", name: producto.marca },
    ...(producto.genero
      ? {
          audience: {
            "@type": "PeopleAudience",
            suggestedGender: GENERO[producto.genero],
          },
        }
      : {}),
    ...(producto.perfumistas.length > 0
      ? { manufacturer: { "@type": "Organization", name: producto.marca } }
      : {}),
    ...(precios.length > 0
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "ARS",
            lowPrice: Math.min(...precios),
            highPrice: Math.max(...precios),
            offerCount: precios.length,
            offers: producto.variantes.map((v) => ({
              "@type": "Offer",
              name: `${producto.nombre} — ${PRESENTACION[v.kind]}${v.sizeMl ? ` ${v.sizeMl} ml` : ""}`,
              price: v.precio,
              priceCurrency: "ARS",
              availability: "https://schema.org/InStock",
              itemCondition: "https://schema.org/NewCondition",
              url,
              seller: { "@type": "Organization", name: siteDefaults.legalName },
            })),
          },
        }
      : {}),
  };
}

/** Migas de pan para Google, que las muestra arriba del resultado. */
export function migasJsonLd(migas: { nombre: string; ruta: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: migas.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.nombre,
      item: urlAbsoluta(m.ruta),
    })),
  };
}
