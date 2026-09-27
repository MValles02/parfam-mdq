import type { Prisma } from "@/generated/prisma/client";
import type {
  Concentration,
  Gender,
  NotePosition,
  ProductStatus,
  VariantKind,
} from "@/generated/prisma/enums";

/**
 * Spanish (es-AR) enum labels for the catalog. They live outside components
 * because the admin, storefront, and WhatsApp message builder use them.
 *
 * Each object's order matches its corresponding select's display order.
 */

export const GENDER_LABELS: Record<Gender, string> = {
  WOMEN: "Para ella",
  MEN: "Para él",
  UNISEX: "Unisex",
};

export const CONCENTRATION_LABELS: Record<Concentration, string> = {
  EAU_FRAICHE: "Eau Fraîche",
  EAU_DE_COLOGNE: "Eau de Cologne",
  EAU_DE_TOILETTE: "Eau de Toilette",
  EAU_DE_PARFUM: "Eau de Parfum",
  PARFUM: "Parfum",
  EXTRAIT: "Extrait de Parfum",
};

/** Short version for table rows and catalog chips. */
export const SHORT_CONCENTRATION_LABELS: Record<Concentration, string> = {
  EAU_FRAICHE: "Fraîche",
  EAU_DE_COLOGNE: "EDC",
  EAU_DE_TOILETTE: "EDT",
  EAU_DE_PARFUM: "EDP",
  PARFUM: "Parfum",
  EXTRAIT: "Extrait",
};

/**
 * Product and FragranceRef no longer store season/daypart as enums: each is a
 * 0..100 percentage column (`seasonSpring`, `daypartDay`, ...). These keys
 * name that fixed set of columns for iteration in shared UI and queries.
 */
export const SEASON_KEYS = ["spring", "summer", "fall", "winter"] as const;
export type SeasonKey = (typeof SEASON_KEYS)[number];

export const SEASON_LABELS: Record<SeasonKey, string> = {
  spring: "Primavera",
  summer: "Verano",
  fall: "Otoño",
  winter: "Invierno",
};

export const DAYPART_KEYS = ["day", "night"] as const;
export type DaypartKey = (typeof DAYPART_KEYS)[number];

export const DAYPART_LABELS: Record<DaypartKey, string> = {
  day: "Día",
  night: "Noche",
};

export const VARIANT_KIND_LABELS: Record<VariantKind, string> = {
  FULL_BOTTLE: "Frasco entero",
  TESTER: "Tester",
  DECANT: "Decant",
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
};

export const PYRAMID_LEVEL_LABELS: Record<NotePosition, string> = {
  TOP: "Notas de salida",
  MIDDLE: "Notas de corazón",
  BASE: "Notas de fondo",
};

/** The three levels in fragrance evaporation order. */
export const PYRAMID_LEVELS: NotePosition[] = ["TOP", "MIDDLE", "BASE"];

/** Spanish labels for the rounded 1..5 `longevity` characteristic bar. */
export const LONGEVITY_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Muy débil",
  2: "Débil",
  3: "Moderada",
  4: "Duradera",
  5: "Eterna",
};

/** Spanish labels for the rounded 1..4 `sillage` characteristic bar. */
export const SILLAGE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Íntima",
  2: "Moderada",
  3: "Fuerte",
  4: "Enorme",
};

/**
 * Variant label as the customer sees it ("Decant 10 ml").
 * It is also the `variantLabel` frozen into OrderItem when an order is placed.
 */
export function getVariantLabel(kind: VariantKind, sizeMl: number | null) {
  return sizeMl
    ? `${VARIANT_KIND_LABELS[kind]} ${sizeMl} ml`
    : VARIANT_KIND_LABELS[kind];
}

const arsPriceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** Formats an ARS price. Accepts Prisma Decimal values already converted to strings. */
export function formatArsPrice(value: string | number) {
  return arsPriceFormatter.format(Number(value));
}

/**
 * Lowest `priceArs` among active variants, as the Decimal's string form
 * (never converted to a JS float, so it keeps exact precision). Both the
 * store's product cards and the admin product table need this: the price a
 * customer can actually pay today. Returns null when no variant is active.
 */
export function getStartingPrice(
  variants: { priceArs: Prisma.Decimal; isActive: boolean }[],
): string | null {
  return variants
    .filter((variant) => variant.isActive)
    .reduce<string | null>((minimum, variant) => {
      const price = variant.priceArs.toString();
      return minimum === null || Number(price) < Number(minimum)
        ? price
        : minimum;
    }, null);
}

/**
 * Normalizes a proper name from the dataset ("françois demachy",
 * "PAUL PARQUET") for display: "François Demachy", "Paul Parquet".
 *
 * `Perfumer.name` has inconsistent capitalization from the initial import:
 * 718 of 1,355 rows are entirely lowercase, depending on which CSV supplied
 * the value. Normalize it at display time to avoid overwriting manual admin
 * corrections; the importer should normalize it before production import.
 *
 * Particles ("de", "van", "di"...) stay lowercase unless they begin a name,
 * following Spanish and French conventions.
 */
const NAME_PARTICLES = new Set([
  "de",
  "del",
  "la",
  "le",
  "van",
  "von",
  "di",
  "da",
  "dos",
  "y",
]);

export function formatProperName(name: string): string {
  return name
    .toLocaleLowerCase("es-AR")
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) =>
      index > 0 && NAME_PARTICLES.has(word)
        ? word
        : word.replace(/^\p{L}/u, (letter) =>
            letter.toLocaleUpperCase("es-AR"),
          ),
    )
    .join(" ");
}
