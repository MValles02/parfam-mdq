import type { MetadataRoute } from "next";
import { URL_SITIO, urlAbsoluta } from "@/lib/seo";

/**
 * `robots.ts` tambien es un Route Handler cacheado por defecto, pero acá no
 * lee de la base: es estatico, asi que no hace falta `revalidate`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/"],
    },
    sitemap: urlAbsoluta("/sitemap.xml"),
    host: URL_SITIO,
  };
}
