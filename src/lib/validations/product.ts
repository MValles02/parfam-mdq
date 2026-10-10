import { z } from "zod";
import {
  Concentration,
  Gender,
  NotePosition,
  ProductStatus,
  VariantKind,
} from "@/generated/prisma/enums";
import { VARIANT_KIND_LABELS as variantKindLabels } from "@/lib/catalog";
import { isProductStorageKey } from "@/lib/r2";

/**
 * Shared product form contract. React Hook Form validates for immediate
 * feedback and the Server Action validates again at the actual boundary.
 */

const MAX_YEAR = new Date().getFullYear() + 2;

/** An empty input represents no value, rather than a persisted empty string. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `No puede superar los ${max} caracteres.`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null);

/**
 * Prices use Decimal and move as strings end to end to avoid floats.
 * Decimal(10,2) allows up to eight integer digits.
 *
 * Input follows es-AR habits but also accepts a decimal point:
 * - with a comma, dots are thousands separators ("8.100,50" -> 8100.50);
 * - without a comma, dots in groups of exactly three digits are thousands
 *   separators ("8.100" -> 8100, "1.250.000" -> 1250000);
 * - otherwise a single dot is the decimal point ("8100.50" -> 8100.50).
 */
const formatArsPrice = z
  .string()
  .trim()
  .min(1, "Poné un precio.")
  .transform((v) =>
    v.includes(",")
      ? v.replace(/\./g, "").replace(",", ".")
      : /^\d{1,3}(\.\d{3})+$/.test(v)
        ? v.replace(/\./g, "")
        : v,
  )
  .refine(
    (v) => /^\d{1,8}(?:\.\d{1,2})?$/.test(v),
    "Usá sólo números, con hasta dos decimales.",
  )
  .refine((v) => Number(v) > 0, "El precio tiene que ser mayor a cero.");

/** Quick edits from the mobile product cards. */
export const variantPriceSchema = z.object({
  variantId: z.string().min(1),
  priceArs: formatArsPrice,
});

export const variantActiveSchema = z.object({
  variantId: z.string().min(1),
  isActive: z.boolean(),
});

const characteristicBar = z
  .number()
  .int()
  .min(1)
  .max(5)
  .nullable()
  .default(null)
  .describe("Administrator-set 1-5 characteristic bar.");

/**
 * Longevity and sillage are community averages copied from `FragranceRef`
 * (or set by hand for a manually created product), stored as
 * `Decimal(3, 2)` so they keep two decimal places instead of Product's
 * whole-number characteristic bars.
 */
const longevitySchema = z
  .number()
  .min(1, "La longevidad va de 1 a 5.")
  .max(5, "La longevidad va de 1 a 5.")
  .multipleOf(0.01, "Hasta dos decimales.")
  .nullable()
  .default(null);

const sillageSchema = z
  .number()
  .min(1, "La estela va de 1 a 4.")
  .max(4, "La estela va de 1 a 4.")
  .multipleOf(0.01, "Hasta dos decimales.")
  .nullable()
  .default(null);

/** 0..100 percentage shown to customers (season or daypart split). */
const percentageSchema = z
  .number()
  .int()
  .min(0)
  .max(100)
  .nullable()
  .default(null);

const variantSchema = z.object({
  /** Present only while editing: identifies an existing database row. */
  id: z.string().nullable().default(null),
  kind: z.enum(VariantKind),
  sizeMl: z
    .number()
    .int("Los mililitros van sin decimales.")
    .min(1, "Tiene que ser al menos 1 ml.")
    .max(1000, "¿Más de un litro? Revisá el dato.")
    .nullable()
    .default(null),
  priceArs: formatArsPrice,
  isActive: z.boolean().default(true),
  sku: optionalText(64),
});

const noteSchema = z.object({
  noteId: z.string().min(1),
  /** Null for a flat note list without top/middle/base tiers. */
  position: z.enum(NotePosition).nullable(),
  weight: z.number().int().min(0).max(100).default(0),
});

const accordSchema = z.object({
  accordId: z.string().min(1),
  strength: z.number().int().min(0).max(100),
});

const imageSchema = z.object({
  id: z.string().nullable().default(null),
  /**
   * R2 object key, not URL. The public host is configuration and must not be
   * frozen in the database. Client-provided keys must match the product prefix
   * to prevent references to another bucket area.
   */
  storageKey: z
    .string()
    .min(1)
    .max(512)
    .refine(isProductStorageKey, "Esa imagen no es válida."),
  alt: optionalText(160),
  isPrimary: z.boolean().default(false),
});

export const productSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "El nombre es obligatorio.")
      .max(160, "El nombre es muy largo."),

    /**
     * A brand may come from search with an ID or be typed manually as a name.
     * The server creates missing brands during product persistence.
     */
    brandId: z.string().nullable().default(null),
    brandName: z.string().trim().min(1, "La marca es obligatoria.").max(120),

    fragranceRefId: z.string().nullable().default(null),
    sourceUrl: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .default(null)
      .refine(
        (v) => v === null || z.url().safeParse(v).success,
        "Pegá un link completo (https://…).",
      ),

    description: optionalText(4000),
    gender: z.enum(Gender).nullable().default(null),
    concentration: z.enum(Concentration).nullable().default(null),
    year: z
      .number()
      .int()
      .min(1800, "Año demasiado antiguo.")
      .max(MAX_YEAR, `El año no puede pasar de ${MAX_YEAR}.`)
      .nullable()
      .default(null),

    collection: optionalText(120),
    longevity: longevitySchema,
    sillage: sillageSchema,
    intensity: characteristicBar,

    seasonSpring: percentageSchema,
    seasonSummer: percentageSchema,
    seasonFall: percentageSchema,
    seasonWinter: percentageSchema,
    daypartDay: percentageSchema,
    daypartNight: percentageSchema,

    status: z.enum(ProductStatus).default(ProductStatus.DRAFT),
    isFeatured: z.boolean().default(false),

    /** Empty values are derived by the server from brand and product name. */
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .default(null)
      .refine(
        (v) => v === null || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v),
        "Sólo minúsculas, números y guiones.",
      ),
    seoTitle: optionalText(70),
    seoDescription: optionalText(180),

    notes: z.array(noteSchema).max(60).default([]),
    accords: z.array(accordSchema).max(20).default([]),
    perfumerIds: z.array(z.string()).max(10).default([]),
    variants: z.array(variantSchema).max(20).default([]),
    images: z.array(imageSchema).max(12).default([]),
  })
  .superRefine((values, ctx) => {
    // A pyramid is all-or-nothing: either every note carries a position
    // (top/middle/base) or the perfume shows as a flat, unordered list.
    // A mix would render some notes without a tier for no clear reason.
    const notesWithPosition = values.notes.filter(
      (note) => note.position !== null,
    ).length;
    if (notesWithPosition > 0 && notesWithPosition < values.notes.length) {
      ctx.addIssue({
        code: "custom",
        path: ["notes"],
        message:
          "Todas las notas necesitan una posición (salida, corazón, fondo) o ninguna.",
      });
    }

    // Adding the same accord twice would double its weight in the "similar
    // perfumes" query without the administrator noticing.
    const seenAccords = new Set<string>();
    values.accords.forEach((accord, index) => {
      if (seenAccords.has(accord.accordId)) {
        ctx.addIssue({
          code: "custom",
          path: ["accords", index, "accordId"],
          message: "Ese acorde ya está cargado.",
        });
      }
      seenAccords.add(accord.accordId);
    });

    // Duplicate "Decant 10 ml" variants are indistinguishable to customers
    // and ambiguous in the WhatsApp order message.
    const seenVariants = new Set<string>();
    values.variants.forEach((variant, index) => {
      if (variant.kind === VariantKind.TESTER && variant.id === null) {
        ctx.addIssue({
          code: "custom",
          path: ["variants", index, "kind"],
          message: "Los testers ya no se venden: elegí frasco entero o decant.",
        });
      }
      const variantKey = `${variant.kind}|${variant.sizeMl ?? ""}`;
      if (seenVariants.has(variantKey)) {
        ctx.addIssue({
          code: "custom",
          path: ["variants", index, "sizeMl"],
          message: `Ya cargaste ${variantKindLabels[variant.kind]}${variant.sizeMl ? ` de ${variant.sizeMl} ml` : ""}.`,
        });
      }
      seenVariants.add(variantKey);
    });

    // Published products need a purchasable active variant.
    if (values.status === ProductStatus.PUBLISHED) {
      // Legacy testers are never sold, so they do not make a product purchasable.
      if (
        !values.variants.some(
          (variant) => variant.isActive && variant.kind !== VariantKind.TESTER,
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["variants"],
          message:
            "Para publicarlo necesitás al menos una presentación activa con precio.",
        });
      }
      if (!values.description) {
        ctx.addIssue({
          code: "custom",
          path: ["description"],
          message: "Escribí la descripción antes de publicarlo.",
        });
      }
    }

    // Exactly one primary image supplies the catalog grid photo.
    const primaryImageCount = values.images.filter(
      (image) => image.isPrimary,
    ).length;
    if (values.images.length > 0 && primaryImageCount !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["images"],
        message: "Marcá una (y sólo una) foto como principal.",
      });
    }
  });

/** Form values before Zod transformations and defaults. */
export type ProductFormInput = z.input<typeof productSchema>;
/** Normalized values received by the Server Action. */
export type ProductFormValues = z.output<typeof productSchema>;
