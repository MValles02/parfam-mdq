/**
 * Valores por defecto de la marca.
 *
 * A partir de la Fase 6 estos campos son editables desde `/admin/configuracion`
 * y viven en la tabla `SiteSetting`; esto es la semilla y el fallback cuando
 * todavia no hay fila en la base.
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
