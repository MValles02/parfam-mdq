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
import { PRESENTACION } from "@/lib/catalogo";

/**
 * Contrato unico del formulario de producto: lo usa react-hook-form en el
 * cliente y lo vuelve a correr la Server Action en el servidor. El cliente
 * valida para dar feedback; el servidor valida porque es el unico borde real.
 */

const ANIO_MAX = new Date().getFullYear() + 2;

/** "" del <input> vacio equivale a "sin dato", no a un string vacio guardado. */
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `No puede superar los ${max} caracteres.`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null);

/**
 * Los precios se guardan como Decimal: viajan en string de punta a punta para
 * no pasar nunca por un float (ver AGENTS.md). Decimal(10,2) admite hasta
 * 8 digitos enteros.
 */
const precioArs = z
  .string()
  .trim()
  .min(1, "Poné un precio.")
  .transform((v) => v.replace(/\./g, "").replace(",", "."))
  .refine(
    (v) => /^\d{1,8}(?:\.\d{1,2})?$/.test(v),
    "Usá sólo números, con hasta dos decimales.",
  )
  .refine((v) => Number(v) > 0, "El precio tiene que ser mayor a cero.");

const barra = z
  .number()
  .int()
  .min(1)
  .max(5)
  .nullable()
  .default(null)
  .describe("Barra de carácter 1-5 fijada por el admin.");

export const varianteSchema = z.object({
  /** Presente sólo al editar: identifica la fila que ya existe en la base. */
  id: z.string().nullable().default(null),
  kind: z.enum(VariantKind),
  sizeMl: z
    .number()
    .int("Los mililitros van sin decimales.")
    .min(1, "Tiene que ser al menos 1 ml.")
    .max(1000, "¿Más de un litro? Revisá el dato.")
    .nullable()
    .default(null),
  priceArs: precioArs,
  isActive: z.boolean().default(true),
  sku: textoOpcional(64),
});

export const notaSchema = z.object({
  noteId: z.string().min(1),
  position: z.enum(NotePosition),
});

export const imagenSchema = z.object({
  id: z.string().nullable().default(null),
  url: z.url("La imagen necesita una URL válida."),
  alt: textoOpcional(160),
  isPrimary: z.boolean().default(false),
});

export const productoSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "El nombre es obligatorio.")
      .max(160, "El nombre es muy largo."),

    /**
     * La marca viene del buscador (con id) o tipeada a mano (sólo nombre, y el
     * servidor la crea si no existe). Modelarlo asi evita tener que crear la
     * marca antes de poder guardar el producto.
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

    description: textoOpcional(4000),
    gender: z.enum(Gender).nullable().default(null),
    concentration: z.enum(Concentration).nullable().default(null),
    year: z
      .number()
      .int()
      .min(1800, "Año demasiado antiguo.")
      .max(ANIO_MAX, `El año no puede pasar de ${ANIO_MAX}.`)
      .nullable()
      .default(null),

    seasons: z.array(z.enum(Season)).default([]),
    occasions: z.array(z.enum(Occasion)).default([]),
    longevity: barra,
    sillage: barra,
    intensity: barra,

    status: z.enum(ProductStatus).default(ProductStatus.DRAFT),
    isFeatured: z.boolean().default(false),

    /** Vacio = lo deriva el servidor de marca + nombre. */
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
    seoTitle: textoOpcional(70),
    seoDescription: textoOpcional(180),

    notes: z.array(notaSchema).max(60).default([]),
    accordIds: z.array(z.string()).max(20).default([]),
    perfumerIds: z.array(z.string()).max(10).default([]),
    variants: z.array(varianteSchema).max(20).default([]),
    images: z.array(imagenSchema).max(12).default([]),
  })
  .superRefine((valor, ctx) => {
    // Dos "Decant 10 ml" en el mismo producto serian indistinguibles para el
    // cliente y ambiguos en el mensaje de WhatsApp.
    const vistas = new Set<string>();
    valor.variants.forEach((v, i) => {
      const clave = `${v.kind}|${v.sizeMl ?? ""}`;
      if (vistas.has(clave)) {
        ctx.addIssue({
          code: "custom",
          path: ["variants", i, "sizeMl"],
          message: `Ya cargaste ${PRESENTACION[v.kind]}${v.sizeMl ? ` de ${v.sizeMl} ml` : ""}.`,
        });
      }
      vistas.add(clave);
    });

    // Un producto publicado sin variante activa se veria en la tienda sin
    // precio ni forma de comprarlo.
    if (valor.status === ProductStatus.PUBLISHED) {
      if (!valor.variants.some((v) => v.isActive)) {
        ctx.addIssue({
          code: "custom",
          path: ["variants"],
          message:
            "Para publicarlo necesitás al menos una presentación activa con precio.",
        });
      }
      if (!valor.description) {
        ctx.addIssue({
          code: "custom",
          path: ["description"],
          message: "Escribí la descripción antes de publicarlo.",
        });
      }
    }

    // Exactamente una principal: es la foto de la grilla del catalogo.
    const principales = valor.images.filter((i) => i.isPrimary).length;
    if (valor.images.length > 0 && principales !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["images"],
        message: "Marcá una (y sólo una) foto como principal.",
      });
    }
  });

/** Lo que manda el formulario (antes de los `transform`/`default` de zod). */
export type ProductoFormInput = z.input<typeof productoSchema>;
/** Lo que recibe la Server Action ya normalizado. */
export type ProductoFormValues = z.output<typeof productoSchema>;
export type VarianteFormInput = z.input<typeof varianteSchema>;
export type ImagenFormInput = z.input<typeof imagenSchema>;
