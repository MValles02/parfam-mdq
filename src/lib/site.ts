const BRAND_NAME = "ParfamMdq";
const BRAND_TAGLINE = "No solo es un perfume";

/**
 * Default brand values.
 *
 * `name` and `tagline` are fixed: `SiteSetting` has no columns for them, and
 * they cannot be edited from `/admin/configuracion` by brand-owner decision.
 *
 * `whatsapp`, `whatsappMessageTemplate`, `instagram`, `shippingInfo`,
 * `seoTitle`, and `description` remain editable. Their matching `SiteSetting`
 * columns hold the administrator's values, and these values are the seed
 * (`prisma/seed.ts`) and fallback used by `src/lib/settings.ts` when the row
 * or an optional column is empty.
 */
export const siteDefaults = {
  name: BRAND_NAME,
  legalName: `${BRAND_NAME} Perfumería`,
  tagline: BRAND_TAGLINE,
  seoTitle: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
  description:
    "Perfumes originales en Mar del Plata: frascos y decants. Consultas y pedidos por WhatsApp.",
  city: "Mar del Plata",
  whatsapp: "+5492236163910",
  /**
   * Its `{{...}}` placeholders are a persisted contract: administrators edit
   * this text, and `src/lib/store/order-message.ts` expands those names.
   */
  whatsappMessageTemplate:
    "¡Hola! Quiero hacer este pedido en {{marca}}:\n\n{{items}}\n\nTotal: {{total}}\n\nNombre: {{nombre}}\nPedido: {{numero}}",
  instagram: "parfam_mdq",
  shippingInfo: "Coordinamos envío en Mar del Plata o retiro a convenir.",
} as const;

/**
 * Locale for every customer-facing format (prices, numbers, collation,
 * capitalization) and for the document `lang` attribute.
 */
export const SITE_LOCALE = "es-AR";

/**
 * Brand identity colors as hex values, for surfaces that cannot read the
 * `globals.css` tokens (generated images, contrast math). They match the
 * `--background` cream and `--sidebar` ink tokens.
 */
export const brandColors = {
  ink: "#14120F",
  cream: "#F2EEE9",
} as const;

/** Primary key of the only `SiteSetting` row (the column's database default). */
export const SITE_SETTINGS_ID = "singleton";
