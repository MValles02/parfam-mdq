/**
 * Default brand values.
 *
 * `name` and `tagline` are fixed: `SiteSetting` has no columns for them, and
 * they cannot be edited from `/admin/configuracion` by brand-owner decision.
 *
 * `whatsapp`, `instagram`, and `description` remain editable. Their matching
 * `SiteSetting` columns are optional, and these values are the seed
 * (`prisma/seed.ts`) and fallback used by `src/lib/settings.ts` when the
 * administrator leaves them empty.
 */
export const siteDefaults = {
  name: "ParfamMdq",
  legalName: "ParfamMdq Perfumería",
  tagline: "No solo es un perfume",
  description:
    "Perfumes originales en Mar del Plata: frascos, testers y decants. Consultas y pedidos por WhatsApp.",
  city: "Mar del Plata",
  whatsapp: "+5492236163910",
  instagram: "parfam_mdq",
  url: "https://parfammdq.com",
} as const;

export type SiteDefaults = typeof siteDefaults;
