import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { siteDefaults } from "@/lib/site";

/**
 * Fila única `SiteSetting`, sembrada en la Fase 1 (`prisma/seed.ts`) y
 * editable desde `/admin/configuracion` a partir de la Fase 6.
 *
 * Vive fuera de `src/lib/site.ts` a propósito: ese archivo lo importan
 * Client Components (el header, por ejemplo) y no puede arrastrar Prisma.
 *
 * Cacheada con `unstable_cache` (Next 16 la reemplazó por `"use cache"`,
 * pero eso exige `cacheComponents: true` en `next.config.ts` -- este
 * proyecto no lo activó, así que seguimos en el modelo anterior, donde
 * `unstable_cache` es la API vigente; ver
 * node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md).
 * `/admin/configuracion` invalida con `revalidateTag(TAG_CONFIGURACION_SITIO,
 * { expire: 0 })` al guardar: sin stale-while-revalidate, para que el
 * checkout del siguiente pedido ya vea el número nuevo sin esperar ni
 * reiniciar el servidor.
 */
export const TAG_CONFIGURACION_SITIO = "site-settings";

const PLANTILLA_WHATSAPP_DEFECTO =
  "¡Hola! Quiero hacer este pedido en {{marca}}:\n\n{{items}}\n\nTotal: {{total}}\n\nNombre: {{nombre}}\nPedido: {{numero}}";

/** Mismo texto que mostraba `FormularioCheckout` antes de esta fase: el
 * fallback si `shippingInfo` todavía no lo cargó nadie desde el panel. */
const ENVIO_DEFECTO = "Coordinamos envío en Mar del Plata o retiro a convenir.";

export type ConfiguracionSitio = {
  whatsappNumber: string;
  whatsappMessageTemplate: string;
  brandName: string;
  brandTagline: string;
  instagramHandle: string;
  shippingInfo: string;
  seoDefaultTitle: string;
  seoDefaultDescription: string;
};

async function leerConfiguracionSitio(): Promise<ConfiguracionSitio> {
  const fila = await prisma.siteSetting.findUnique({
    where: { id: "singleton" },
  });

  // No debería pasar (el seed la crea siempre), pero si la fila faltara, el
  // sitio no tiene por qué romperse: cae a los defaults del código.
  if (!fila) {
    return {
      whatsappNumber: siteDefaults.whatsapp,
      whatsappMessageTemplate: PLANTILLA_WHATSAPP_DEFECTO,
      brandName: siteDefaults.name,
      brandTagline: siteDefaults.tagline,
      instagramHandle: siteDefaults.instagram,
      shippingInfo: ENVIO_DEFECTO,
      seoDefaultTitle: `${siteDefaults.name} — ${siteDefaults.tagline}`,
      seoDefaultDescription: siteDefaults.description,
    };
  }

  return {
    whatsappNumber: fila.whatsappNumber,
    whatsappMessageTemplate: fila.whatsappMessageTemplate,
    brandName: fila.brandName,
    brandTagline: fila.brandTagline,
    // Columnas opcionales: si el admin las dejó vacías, la tienda muestra un
    // fallback en vez de un hueco en blanco.
    instagramHandle: fila.instagramHandle ?? siteDefaults.instagram,
    shippingInfo: fila.shippingInfo ?? ENVIO_DEFECTO,
    seoDefaultTitle:
      fila.seoDefaultTitle ?? `${fila.brandName} — ${fila.brandTagline}`,
    seoDefaultDescription:
      fila.seoDefaultDescription ?? siteDefaults.description,
  };
}

const configuracionCacheada = unstable_cache(
  leerConfiguracionSitio,
  ["site-settings"],
  { tags: [TAG_CONFIGURACION_SITIO] },
);

/**
 * `connection()` corta el prerender acá (Fase 7). Sin esto, toda ruta que
 * lea la configuración -- y son todas, porque el `generateMetadata()` del
 * root layout la lee -- se prerenderiza en `next build` y queda con el valor
 * que tenía la base EN EL BUILD. Como el build corre en CI, ese valor sería
 * el del seed: cada deploy revertiría el footer, el título y el texto de
 * envío hasta que alguien volviera a guardar en `/admin/configuracion`.
 *
 * Con `connection()` el dato se lee siempre en runtime, contra la base real,
 * y el build deja de necesitar Postgres. El costo es que las cinco páginas
 * que antes salían prerenderizadas (`/carrito`, `/checkout`, `/contacto`,
 * `/como-comprar`, `/que-es-un-tester`) pasan a renderizarse por request; la
 * consulta en sí la sigue ahorrando `unstable_cache` con su tag, así que lo
 * que se paga es el render, no un viaje a la base por visita.
 *
 * Ver node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md
 * y PLAN.md § Fase 7.
 */
export async function obtenerConfiguracionSitio(): Promise<ConfiguracionSitio> {
  await connection();
  return configuracionCacheada();
}
