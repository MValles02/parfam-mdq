import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { siteDefaults } from "@/lib/site";

/**
 * Singleton `SiteSetting`, seeded by `prisma/seed.ts` and editable from
 * `/admin/configuracion`.
 *
 * It deliberately lives outside `src/lib/site.ts`: Client Components import
 * that file (the header, for example), and it cannot pull in Prisma.
 *
 * It is cached with `unstable_cache` (Next 16 replaced it with `"use cache"`,
 * but that requires `cacheComponents: true` in `next.config.ts`). This project
 * does not enable it, so the previous model remains current; see
 * node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md).
 * `/admin/configuracion` invalidates it with `revalidateTag(SITE_SETTINGS_TAG,
 * { expire: 0 })` on save, without stale-while-revalidate, so the next
 * checkout sees the updated number without waiting or restarting the server.
 */
export const SITE_SETTINGS_TAG = "site-settings";

const DEFAULT_WHATSAPP_TEMPLATE =
  "¡Hola! Quiero hacer este pedido en {{marca}}:\n\n{{items}}\n\nTotal: {{total}}\n\nNombre: {{nombre}}\nPedido: {{numero}}";

/** Fallback `shippingInfo` passed to `CheckoutForm` when settings have no value. */
const DEFAULT_SHIPPING_INFO =
  "Coordinamos envío en Mar del Plata o retiro a convenir.";

export type SiteSettings = {
  whatsappNumber: string;
  whatsappMessageTemplate: string;
  instagramHandle: string;
  shippingInfo: string;
  seoDefaultTitle: string;
  seoDefaultDescription: string;
};

async function readSiteSettings(): Promise<SiteSettings> {
  const row = await prisma.siteSetting.findUnique({
    where: { id: "singleton" },
  });

  // The seed always creates this row, but a missing row should not break the
  // site: fall back to code defaults.
  if (!row) {
    return {
      whatsappNumber: siteDefaults.whatsapp,
      whatsappMessageTemplate: DEFAULT_WHATSAPP_TEMPLATE,
      instagramHandle: siteDefaults.instagram,
      shippingInfo: DEFAULT_SHIPPING_INFO,
      seoDefaultTitle: `${siteDefaults.name} — ${siteDefaults.tagline}`,
      seoDefaultDescription: siteDefaults.description,
    };
  }

  return {
    whatsappNumber: row.whatsappNumber,
    whatsappMessageTemplate: row.whatsappMessageTemplate,
    // Optional columns fall back instead of leaving a blank space when the
    // administrator has not supplied a value.
    instagramHandle: row.instagramHandle ?? siteDefaults.instagram,
    shippingInfo: row.shippingInfo ?? DEFAULT_SHIPPING_INFO,
    seoDefaultTitle:
      row.seoDefaultTitle ?? `${siteDefaults.name} — ${siteDefaults.tagline}`,
    seoDefaultDescription:
      row.seoDefaultDescription ?? siteDefaults.description,
  };
}

const cachedSiteSettings = unstable_cache(readSiteSettings, ["site-settings"], {
  tags: [SITE_SETTINGS_TAG],
});

/**
 * `connection()` stops prerendering here. Without it, every route that reads
 * settings—every route, because root `generateMetadata()` reads them—would be
 * prerendered during `next build` with the database value present AT BUILD
 * TIME. Because CI runs the build, that value would be the seed value: each
 * deployment would reset footer, title, and shipping copy until someone saved
 * settings again in `/admin/configuracion`.
 *
 * With `connection()`, settings always load at runtime from the real database,
 * and builds no longer need Postgres. The tradeoff is that five previously
 * prerendered pages (`/carrito`, `/checkout`, `/contacto`, `/como-comprar`,
 * `/que-es-un-tester`) render per request. `unstable_cache` and its tag still
 * cache the query, so only rendering occurs per visit, not a database trip.
 *
 * See node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  await connection();
  return cachedSiteSettings();
}
