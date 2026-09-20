/**
 * Valores por defecto de la marca.
 *
 * `name` y `tagline` son fijos: no tienen columna en `SiteSetting` ni se
 * editan desde `/admin/configuracion` (decision del dueño de la marca).
 *
 * `whatsapp`, `instagram` y `description` en cambio sí siguen siendo
 * editables: las columnas correspondientes de `SiteSetting` son opcionales,
 * y estos valores son la semilla (`prisma/seed.ts`) y el fallback que usa
 * `src/lib/configuracion.ts` cuando el admin las deja vacías.
 */
export const siteDefaults = {
  name: "ParfamMdq",
  legalName: "ParfamMdq Perfumeria",
  tagline: "No solo es un perfume",
  description:
    "Perfumes originales en Mar del Plata: frascos, testers y decants. Consultas y pedidos por WhatsApp.",
  city: "Mar del Plata",
  whatsapp: "+5492236163910",
  instagram: "parfam_mdq",
  url: "https://parfammdq.com",
} as const;

export type SiteDefaults = typeof siteDefaults;
