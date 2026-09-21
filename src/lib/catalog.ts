import type {
  Concentration,
  Gender,
  NotePosition,
  Occasion,
  ProductStatus,
  Season,
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

export const SEASON_LABELS: Record<Season, string> = {
  SPRING: "Primavera",
  SUMMER: "Verano",
  FALL: "Otoño",
  WINTER: "Invierno",
};

export const OCCASION_LABELS: Record<Occasion, string> = {
  DAY: "Día",
  NIGHT: "Noche",
  CASUAL: "Casual",
  FORMAL: "Formal",
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
