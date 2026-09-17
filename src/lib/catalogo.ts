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
 * Etiquetas en espaniol (es-AR) de los enums del catalogo. Viven fuera de los
 * componentes porque las usan tanto el panel como el storefront (Fase 4) y el
 * armado del mensaje de WhatsApp (Fase 5).
 *
 * El orden de cada objeto es el orden en que se muestran los selects.
 */

export const GENERO: Record<Gender, string> = {
  WOMEN: "Para ella",
  MEN: "Para él",
  UNISEX: "Unisex",
};

export const CONCENTRACION: Record<Concentration, string> = {
  EAU_FRAICHE: "Eau Fraîche",
  EAU_DE_COLOGNE: "Eau de Cologne",
  EAU_DE_TOILETTE: "Eau de Toilette",
  EAU_DE_PARFUM: "Eau de Parfum",
  PARFUM: "Parfum",
  EXTRAIT: "Extrait de Parfum",
};

/** Version corta para las filas de tablas y los chips del catalogo. */
export const CONCENTRACION_CORTA: Record<Concentration, string> = {
  EAU_FRAICHE: "Fraîche",
  EAU_DE_COLOGNE: "EDC",
  EAU_DE_TOILETTE: "EDT",
  EAU_DE_PARFUM: "EDP",
  PARFUM: "Parfum",
  EXTRAIT: "Extrait",
};

export const ESTACION: Record<Season, string> = {
  SPRING: "Primavera",
  SUMMER: "Verano",
  FALL: "Otoño",
  WINTER: "Invierno",
};

export const OCASION: Record<Occasion, string> = {
  DAY: "Día",
  NIGHT: "Noche",
  CASUAL: "Casual",
  FORMAL: "Formal",
};

export const PRESENTACION: Record<VariantKind, string> = {
  FULL_BOTTLE: "Frasco entero",
  TESTER: "Tester",
  DECANT: "Decant",
};

export const ESTADO_PRODUCTO: Record<ProductStatus, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
};

export const NIVEL_PIRAMIDE: Record<NotePosition, string> = {
  TOP: "Notas de salida",
  MIDDLE: "Notas de corazón",
  BASE: "Notas de fondo",
};

/** Los tres niveles en el orden en que se evapora la fragancia. */
export const NIVELES: NotePosition[] = ["TOP", "MIDDLE", "BASE"];

/**
 * Etiqueta de una variante tal como la ve el cliente ("Decant 10 ml").
 * Tambien es el `variantLabel` que se congela en OrderItem al cerrar un pedido.
 */
export function etiquetaVariante(kind: VariantKind, sizeMl: number | null) {
  return sizeMl ? `${PRESENTACION[kind]} ${sizeMl} ml` : PRESENTACION[kind];
}

const formatoPesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** Formatea un precio en ARS. Acepta el Decimal de Prisma ya pasado a string. */
export function precioArs(valor: string | number) {
  return formatoPesos.format(Number(valor));
}

/**
 * Normaliza un nombre propio que viene del dataset ("françois demachy",
 * "PAUL PARQUET") para mostrarlo: "François Demachy", "Paul Parquet".
 *
 * Hace falta porque `Perfumer.name` quedo con mayusculas inconsistentes en el
 * import de la Fase 1 -- 718 de las 1.355 filas estan enteras en minuscula,
 * segun de cual de los dos CSV vino el dato. Se arregla al mostrar y no en la
 * base para no pisar correcciones que el admin pueda hacer a mano; el
 * importador tendria que normalizarlo antes de la importacion de produccion.
 *
 * Las particulas ("de", "van", "di"...) quedan en minuscula salvo que abran el
 * nombre, que es como se escriben en castellano y en frances.
 */
const PARTICULAS = new Set([
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

export function nombrePropio(nombre: string): string {
  return nombre
    .toLocaleLowerCase("es-AR")
    .split(/\s+/)
    .filter(Boolean)
    .map((palabra, i) =>
      i > 0 && PARTICULAS.has(palabra)
        ? palabra
        : palabra.replace(/^\p{L}/u, (l) => l.toLocaleUpperCase("es-AR")),
    )
    .join(" ");
}
