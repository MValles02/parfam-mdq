import { z } from "zod";
import {
  Concentration,
  Gender,
  NotePosition,
  Occasion,
  ProductStatus,
  Season,
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
 */
const formatArsPrice = z
  .string()
  .trim()
  .min(1, "Poné un precio.")
  .transform((v) => v.replace(/\./g, "").replace(",", "."))
  .refine(
    (v) => /^\d{1,8}(?:\.\d{1,2})?$/.test(v),
    "Usá sólo números, con hasta dos decimales.",
  )
  .refine((v) => Number(v) > 0, "El precio tiene que ser mayor a cero.");

const characteristicBar = z
  .number()
  .int()
  .min(1)
  .max(5)
  .nullable()
  .default(null)
  .describe("Administrator-set 1-5 characteristic bar.");

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
  position: z.enum(NotePosition),
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

    seasons: z.array(z.enum(Season)).default([]),
    occasions: z.array(z.enum(Occasion)).default([]),
    longevity: characteristicBar,
    sillage: characteristicBar,
    intensity: characteristicBar,

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
    accordIds: z.array(z.string()).max(20).default([]),
    perfumerIds: z.array(z.string()).max(10).default([]),
    variants: z.array(variantSchema).max(20).default([]),
    images: z.array(imageSchema).max(12).default([]),
  })
  .superRefine((values, ctx) => {
    // Duplicate "Decant 10 ml" variants are indistinguishable to customers
    // and ambiguous in the WhatsApp order message.
    const seenVariants = new Set<string>();
    values.variants.forEach((variant, index) => {
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
      if (!values.variants.some((variant) => variant.isActive)) {
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
