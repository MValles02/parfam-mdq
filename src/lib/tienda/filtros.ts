import {
  createLoader,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";
import type { Gender, VariantKind } from "@/generated/prisma/enums";

/**
 * Modelo de filtros del catalogo. Vive en la URL (AGENTS.md): los parsers se
 * definen una sola vez acá y los usan las dos puntas -- el Server Component
 * con `cargarFiltros(searchParams)` y los controles de cliente con
 * `useQueryStates(parsersCatalogo)`. Si estuvieran duplicados, un default
 * distinto de cada lado daria resultados distintos a los que muestra la UI.
 *
 * Los nombres de los parametros son los que ve el usuario en la barra de
 * direcciones, asi que van en castellano.
 */

export const GENEROS = ["WOMEN", "MEN", "UNISEX"] as const satisfies Gender[];

export const PRESENTACIONES = [
  "FULL_BOTTLE",
  "TESTER",
  "DECANT",
] as const satisfies VariantKind[];

export const ORDENES = [
  "novedades",
  "precio-asc",
  "precio-desc",
  "nombre",
] as const;

export type Orden = (typeof ORDENES)[number];

export const ETIQUETA_ORDEN: Record<Orden, string> = {
  novedades: "Novedades",
  "precio-asc": "Precio: menor a mayor",
  "precio-desc": "Precio: mayor a menor",
  nombre: "Nombre (A-Z)",
};

/**
 * Rangos de precio como opciones cerradas y no como dos inputs: quedan cuatro
 * escalones legibles y el parametro de la URL acotado.
 *
 * Los cortes siguen la escala real del catalogo: los decants arrancan cerca de
 * los $ 25.000, los frascos y testers viven arriba de los $ 148.000. Un
 * producto entra al rango si *alguna* de sus variantes activas cae adentro,
 * asi que "hasta $ 50.000" es "tiene algo accesible", no "es barato".
 *
 * TODO(Fase 8): revisar los cortes cuando esten cargados los precios reales de
 * los ~40 productos; hoy estan calibrados contra los del seed de desarrollo.
 */
export const RANGOS_PRECIO = [
  "hasta-50000",
  "50000-100000",
  "100000-200000",
  "desde-200000",
] as const;

export type RangoPrecio = (typeof RANGOS_PRECIO)[number];

export const LIMITES_PRECIO: Record<
  RangoPrecio,
  { min?: number; max?: number }
> = {
  "hasta-50000": { max: 50000 },
  "50000-100000": { min: 50000, max: 100000 },
  "100000-200000": { min: 100000, max: 200000 },
  "desde-200000": { min: 200000 },
};

export const ETIQUETA_PRECIO: Record<RangoPrecio, string> = {
  "hasta-50000": "Hasta $ 50.000",
  "50000-100000": "$ 50.000 a $ 100.000",
  "100000-200000": "$ 100.000 a $ 200.000",
  "desde-200000": "Más de $ 200.000",
};

export const parsersCatalogo = {
  q: parseAsString.withDefault(""),
  genero: parseAsStringLiteral(GENEROS),
  presentacion: parseAsStringLiteral(PRESENTACIONES),
  marca: parseAsString,
  acorde: parseAsString,
  nota: parseAsString,
  precio: parseAsStringLiteral(RANGOS_PRECIO),
  orden: parseAsStringLiteral(ORDENES).withDefault("novedades"),
  pagina: parseAsInteger.withDefault(1),
};

/**
 * `shallow: false` hace que cambiar un filtro vuelva al servidor a pedir la
 * grilla nueva (el filtrado es server-side), y `clearOnDefault` saca el
 * parametro de la URL cuando vuelve a su valor por defecto, asi
 * "limpiar filtros" deja una URL limpia y compartible.
 */
export const opcionesCatalogo = {
  shallow: false,
  clearOnDefault: true,
  scroll: false,
} as const;

export const cargarFiltros = createLoader(parsersCatalogo);

export type FiltrosCatalogo = {
  q: string;
  genero: Gender | null;
  presentacion: VariantKind | null;
  marca: string | null;
  acorde: string | null;
  nota: string | null;
  precio: RangoPrecio | null;
  orden: Orden;
  pagina: number;
};

/** Cuántos filtros están puestos, para el contador del botón en mobile. */
export function contarFiltrosActivos(f: FiltrosCatalogo): number {
  return [
    f.q.trim() || null,
    f.genero,
    f.presentacion,
    f.marca,
    f.acorde,
    f.nota,
    f.precio,
  ].filter(Boolean).length;
}
