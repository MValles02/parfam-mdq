/**
 * Seed de desarrollo: crea 6 productos reales adoptando referencias de
 * Fragrantica que YA estan en la base (import-fragrantica.ts), para tener
 * datos de verdad con los que probar el panel y la tienda sin cargar nada
 * a mano. Uno de los 6 queda en DRAFT a proposito, para poder verificar que
 * un borrador no es accesible desde la tienda.
 *
 *   pnpm exec dotenv -e .env -- pnpm exec tsx scripts/seed-dev.ts
 *   pnpm exec dotenv -e .env -- pnpm exec tsx scripts/seed-dev.ts --limpiar
 *
 * Idempotente: la clave de cada producto de dev es su fragranceRefId (no el
 * slug, que en teoria podria cambiar). Antes de crear un producto se borra el
 * que ya exista con esa referencia -- y sus objetos "productos/dev/" en R2 --
 * asi correrlo de nuevo no duplica nada. `--limpiar` hace solo la parte de
 * borrado y termina sin crear.
 *
 * Las notas, acordes y perfumistas se copian de la referencia tal cual hace
 * la adopcion del panel (ver src/lib/admin/referencias.ts). La descripcion,
 * en cambio, se escribe de cero en espaniol: la de Fragrantica nunca se
 * publica (ver AGENTS.md).
 */
import { parseArgs } from "node:util";
import { deflateSync } from "node:zlib";
import type {
  Concentration,
  Gender,
  Occasion,
  ProductStatus,
  Season,
  VariantKind,
} from "@/generated/prisma/enums";
import { aSlug, slugLibre } from "@/lib/admin/slug";
import { prisma } from "@/lib/db";
import { borrarObjeto, r2Configurado, urlDeSubida } from "@/lib/r2";

const { values } = parseArgs({
  options: {
    limpiar: { type: "boolean", default: false },
  },
});
const modoLimpiar = values.limpiar === true;

function fmt(n: number): string {
  return n.toLocaleString("es-AR");
}

// ---------------------------------------------------------------------------
// Mini encoder PNG (sin dependencias nuevas): cabecera + un unico chunk IDAT
// comprimido con deflateSync, filtro "none" en cada fila. Alcanza de sobra
// para las fotos de producto placeholder.
// ---------------------------------------------------------------------------

const TABLA_CRC32 = (() => {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = TABLA_CRC32[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunkPng(tipo: string, data: Buffer): Buffer {
  const tipoBuf = Buffer.from(tipo, "ascii");
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tipoBuf, data])), 0);
  return Buffer.concat([largo, tipoBuf, data, crc]);
}

const ANCHO_IMG = 1000;
const ALTO_IMG = 1250;

/** Lienzo RGB de ANCHO_IMG x ALTO_IMG, con helpers para pintar rectangulos. */
class Lienzo {
  readonly px = Buffer.alloc(ANCHO_IMG * ALTO_IMG * 3);

  rect(x0: number, y0: number, x1: number, y1: number, colorHex: string) {
    const n = Number.parseInt(colorHex.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    const desdeY = Math.max(0, Math.round(y0));
    const hastaY = Math.min(ALTO_IMG, Math.round(y1));
    const desdeX = Math.max(0, Math.round(x0));
    const hastaX = Math.min(ANCHO_IMG, Math.round(x1));
    for (let y = desdeY; y < hastaY; y++) {
      for (let x = desdeX; x < hastaX; x++) {
        const i = (y * ANCHO_IMG + x) * 3;
        this.px[i] = r;
        this.px[i + 1] = g;
        this.px[i + 2] = b;
      }
    }
  }

  /** Rectangulo relleno con un borde de `grosor` px del color `borde`. */
  rectConBorde(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    relleno: string,
    borde: string,
    grosor: number,
  ) {
    this.rect(x0, y0, x1, y1, borde);
    this.rect(x0 + grosor, y0 + grosor, x1 - grosor, y1 - grosor, relleno);
  }

  aPng(): Buffer {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(ANCHO_IMG, 0);
    ihdr.writeUInt32BE(ALTO_IMG, 4);
    ihdr[8] = 8; // profundidad: 8 bits por canal
    ihdr[9] = 2; // color type 2: truecolor sin alfa
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    const stride = ANCHO_IMG * 3;
    const crudo = Buffer.alloc((stride + 1) * ALTO_IMG);
    for (let y = 0; y < ALTO_IMG; y++) {
      crudo[y * (stride + 1)] = 0; // sin filtro
      this.px.copy(
        crudo,
        y * (stride + 1) + 1,
        y * stride,
        y * stride + stride,
      );
    }
    const idat = deflateSync(crudo);

    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunkPng("IHDR", ihdr),
      chunkPng("IDAT", idat),
      chunkPng("IEND", Buffer.alloc(0)),
    ]);
  }
}

const COLOR_FONDO = "#FAF8F5";
const COLOR_TAPA = "#DCD5CA";
const COLOR_CUERPO = "#E8E2D9";
const COLOR_ETIQUETA = "#F2EEE9";

/**
 * Silueta de frasco de un producto: proporciones base (fracciones del
 * lienzo). Cada producto tiene la suya para que las 6 fotos no se vean
 * identicas entre si.
 */
type Silueta = {
  capWFrac: number;
  capHFrac: number;
  bodyWFrac: number;
  bodyHFrac: number;
  labelWFrac: number;
  labelHFrac: number;
  labelYFrac: number;
};

const SILUETAS: Silueta[] = [
  // Sauvage Elixir: frasco alto y angosto.
  {
    capWFrac: 0.14,
    capHFrac: 0.09,
    bodyWFrac: 0.26,
    bodyHFrac: 0.5,
    labelWFrac: 0.7,
    labelHFrac: 0.22,
    labelYFrac: 0.35,
  },
  // Angel: tapa ancha (la estrella), cuerpo mas bajo.
  {
    capWFrac: 0.3,
    capHFrac: 0.1,
    bodyWFrac: 0.32,
    bodyHFrac: 0.4,
    labelWFrac: 0.75,
    labelHFrac: 0.3,
    labelYFrac: 0.3,
  },
  // Tobacco Vanille: frasco bajo y ancho (el clasico Tom Ford).
  {
    capWFrac: 0.2,
    capHFrac: 0.07,
    bodyWFrac: 0.4,
    bodyHFrac: 0.34,
    labelWFrac: 0.65,
    labelHFrac: 0.35,
    labelYFrac: 0.32,
  },
  // La Vie Est Belle: cuerpo mediano, tapa redondeada aproximada con rectangulo.
  {
    capWFrac: 0.18,
    capHFrac: 0.11,
    bodyWFrac: 0.3,
    bodyHFrac: 0.46,
    labelWFrac: 0.72,
    labelHFrac: 0.25,
    labelYFrac: 0.4,
  },
  // Le Male Elixir: cuerpo ancho arriba (el torso marinero).
  {
    capWFrac: 0.16,
    capHFrac: 0.08,
    bodyWFrac: 0.34,
    bodyHFrac: 0.48,
    labelWFrac: 0.6,
    labelHFrac: 0.4,
    labelYFrac: 0.28,
  },
  // Coco Mademoiselle: frasco rectangular, chato y elegante.
  {
    capWFrac: 0.22,
    capHFrac: 0.06,
    bodyWFrac: 0.28,
    bodyHFrac: 0.42,
    labelWFrac: 0.68,
    labelHFrac: 0.5,
    labelYFrac: 0.25,
  },
];

/** Framing de cada una de las 3 fotos de un mismo producto. */
const ENCUADRES = [
  { escala: 1, offsetX: 0, offsetY: 0 }, // foto principal, centrada
  { escala: 1.22, offsetX: 40, offsetY: -30 }, // acercamiento a la etiqueta
  { escala: 0.82, offsetX: -60, offsetY: 40 }, // toma mas alejada, corrida
];

/**
 * Dibuja el frasco `indiceProducto` (0-5, una silueta por producto) con el
 * encuadre `indiceImagen` (0-2, una de las 3 fotos del producto).
 */
function generarImagenFrasco(
  indiceProducto: number,
  indiceImagen: number,
): Buffer {
  const s = SILUETAS[indiceProducto % SILUETAS.length]!;
  const e = ENCUADRES[indiceImagen % ENCUADRES.length]!;
  const lienzo = new Lienzo();
  lienzo.rect(0, 0, ANCHO_IMG, ALTO_IMG, COLOR_FONDO);

  const centroX = ANCHO_IMG / 2;
  const baseY = ALTO_IMG - 190; // el frasco "apoya" siempre a la misma altura

  // Se escala alrededor del punto de apoyo, asi el zoom no hace flotar el
  // frasco: crece/decrece pero se mantiene sentado en el mismo lugar.
  const tx = (x: number) => centroX + (x - centroX) * e.escala + e.offsetX;
  const ty = (y: number) => baseY + (y - baseY) * e.escala + e.offsetY;

  const bodyW = s.bodyWFrac * ANCHO_IMG;
  const bodyH = s.bodyHFrac * ALTO_IMG;
  const capW = s.capWFrac * ANCHO_IMG;
  const capH = s.capHFrac * ALTO_IMG;

  const bodyX0 = centroX - bodyW / 2;
  const bodyX1 = centroX + bodyW / 2;
  const bodyY1 = baseY;
  const bodyY0 = bodyY1 - bodyH;

  const capX0 = centroX - capW / 2;
  const capX1 = centroX + capW / 2;
  const capY1 = bodyY0;
  const capY0 = capY1 - capH;

  const labelW = s.labelWFrac * bodyW;
  const labelX0 = centroX - labelW / 2;
  const labelX1 = centroX + labelW / 2;
  const labelY0 = bodyY0 + s.labelYFrac * bodyH;
  const labelY1 = labelY0 + s.labelHFrac * bodyH;

  lienzo.rectConBorde(
    tx(bodyX0),
    ty(bodyY0),
    tx(bodyX1),
    ty(bodyY1),
    COLOR_CUERPO,
    COLOR_TAPA,
    Math.max(2, Math.round(6 * e.escala)),
  );
  lienzo.rect(tx(capX0), ty(capY0), tx(capX1), ty(capY1), COLOR_TAPA);
  lienzo.rect(
    tx(labelX0),
    ty(labelY0),
    tx(labelX1),
    ty(labelY1),
    COLOR_ETIQUETA,
  );

  return lienzo.aPng();
}

// ---------------------------------------------------------------------------
// Configuracion de los 6 productos de dev
// ---------------------------------------------------------------------------

type VarianteDev = {
  kind: VariantKind;
  sizeMl: number | null;
  priceArs: string;
  isActive: boolean;
};

type ProductoDev = {
  buscarNombre: string;
  buscarMarca: string;
  concentration: Concentration;
  generoFallback: Gender;
  status: ProductStatus;
  description: string;
  seasons: Season[];
  occasions: Occasion[];
  longevity: number;
  sillage: number;
  intensity: number;
  isFeatured: boolean;
  variantes: VarianteDev[];
};

const PRODUCTOS_DEV: ProductoDev[] = [
  {
    buscarNombre: "Sauvage Elixir",
    buscarMarca: "Dior",
    concentration: "PARFUM",
    generoFallback: "MEN",
    status: "PUBLISHED",
    description:
      "Un elixir pensado para la noche: apenas te lo ponés pegan las especias bien fuerte y después se instala un fondo amaderado que se queda horas. Rinde muchísimo, con dos pulsos alcanza y sobra. Si buscás algo que se note sin exagerar en la cantidad, es de los más seguros que tenemos.",
    seasons: ["FALL", "WINTER"],
    occasions: ["NIGHT", "FORMAL"],
    longevity: 5,
    sillage: 5,
    intensity: 5,
    isFeatured: true,
    variantes: [
      {
        kind: "FULL_BOTTLE",
        sizeMl: 100,
        priceArs: "312000.00",
        isActive: true,
      },
      { kind: "TESTER", sizeMl: 100, priceArs: "234000.00", isActive: true },
      { kind: "DECANT", sizeMl: 10, priceArs: "62000.00", isActive: true },
      { kind: "DECANT", sizeMl: 5, priceArs: "36000.00", isActive: true },
    ],
  },
  {
    buscarNombre: "Angel",
    buscarMarca: "Mugler",
    concentration: "EAU_DE_PARFUM",
    generoFallback: "WOMEN",
    status: "PUBLISHED",
    description:
      "Un clásico que se ama o se odia, no hay término medio: dulce a caramelo con un fondo de pachulí que lo vuelve gourmand pero nada empalagoso. Va perfecto para el frío, cuando el ambiente pide algo más envolvente. Si nunca lo probaste, arrancá por el decant antes de ir al frasco entero.",
    seasons: ["WINTER"],
    occasions: ["NIGHT"],
    longevity: 5,
    sillage: 4,
    intensity: 4,
    isFeatured: false,
    variantes: [
      {
        kind: "FULL_BOTTLE",
        sizeMl: 50,
        priceArs: "198000.00",
        isActive: true,
      },
      { kind: "TESTER", sizeMl: 50, priceArs: "148500.00", isActive: true },
      { kind: "DECANT", sizeMl: 10, priceArs: "42000.00", isActive: true },
      { kind: "DECANT", sizeMl: 5, priceArs: "25000.00", isActive: true },
    ],
  },
  {
    buscarNombre: "Tobacco Vanille",
    buscarMarca: "Tom Ford",
    concentration: "EAU_DE_PARFUM",
    generoFallback: "UNISEX",
    status: "PUBLISHED",
    description:
      "Tabaco dulce con vainilla y un toque especiado, ideal para el otoño-invierno. Es de los que dejan estela sin ser invasivo, perfecto para una cena o una juntada de noche. Unisex de verdad: no tiene ese perfil marcadamente masculino ni femenino.",
    seasons: ["FALL", "WINTER"],
    occasions: ["NIGHT", "CASUAL"],
    longevity: 4,
    sillage: 3,
    intensity: 3,
    isFeatured: true,
    variantes: [
      {
        kind: "FULL_BOTTLE",
        sizeMl: 50,
        priceArs: "275000.00",
        isActive: true,
      },
      // A proposito inactiva: es la unica de todo el seed, para poder ver el
      // estado "sin stock" en el mockup.
      { kind: "TESTER", sizeMl: 50, priceArs: "206000.00", isActive: false },
      { kind: "DECANT", sizeMl: 10, priceArs: "58000.00", isActive: true },
    ],
  },
  {
    buscarNombre: "La Vie Est Belle",
    buscarMarca: "Lancome",
    concentration: "EAU_DE_PARFUM",
    generoFallback: "WOMEN",
    status: "PUBLISHED",
    description:
      "Floral gourmand con ese toque de iris y praliné que lo hizo un básico en cualquier perfumero. Anda bien de día y de noche, con una proyección moderada que no cansa. Si te gustan los dulces sin que empalaguen, este es de los más pedidos.",
    seasons: ["SPRING", "SUMMER"],
    occasions: ["DAY", "CASUAL"],
    longevity: 3,
    sillage: 3,
    intensity: 2,
    isFeatured: false,
    variantes: [
      {
        kind: "FULL_BOTTLE",
        sizeMl: 100,
        priceArs: "245000.00",
        isActive: true,
      },
      { kind: "TESTER", sizeMl: 100, priceArs: "183000.00", isActive: true },
      { kind: "DECANT", sizeMl: 10, priceArs: "52000.00", isActive: true },
      { kind: "DECANT", sizeMl: 5, priceArs: "31000.00", isActive: true },
    ],
  },
  {
    buscarNombre: "Le Male Elixir",
    buscarMarca: "Jean Paul Gaultier",
    concentration: "PARFUM",
    generoFallback: "MEN",
    status: "PUBLISHED",
    description:
      "La versión más concentrada del clásico Le Male: lavanda, vainilla y haba tonka en una fórmula bien potente. Ideal para salidas nocturnas donde querés que se note desde lejos. El frasco es el de siempre, el del torso marinero, pero con mucho más carácter adentro.",
    seasons: ["FALL", "WINTER"],
    occasions: ["NIGHT", "FORMAL"],
    longevity: 5,
    sillage: 5,
    intensity: 4,
    isFeatured: false,
    variantes: [
      {
        kind: "FULL_BOTTLE",
        sizeMl: 100,
        priceArs: "268000.00",
        isActive: true,
      },
      { kind: "TESTER", sizeMl: 100, priceArs: "201000.00", isActive: true },
      { kind: "DECANT", sizeMl: 10, priceArs: "56000.00", isActive: true },
      { kind: "DECANT", sizeMl: 5, priceArs: "33000.00", isActive: true },
    ],
  },
  {
    buscarNombre: "Coco Mademoiselle",
    buscarMarca: "Chanel",
    concentration: "EAU_DE_PARFUM",
    generoFallback: "WOMEN",
    // A proposito en borrador: sirve para verificar que la tienda no lo
    // muestra aunque ya tenga variantes y descripcion cargadas.
    status: "DRAFT",
    description:
      "Cítricos frescos al principio y un fondo de pachulí y vainilla que se instala después de un rato. Elegante sin ser pesado, de los que sirven tanto para la oficina como para salir. Queda en borrador hasta que carguemos las fotos definitivas.",
    seasons: ["SPRING", "SUMMER", "FALL"],
    occasions: ["DAY", "FORMAL"],
    longevity: 4,
    sillage: 2,
    intensity: 2,
    isFeatured: false,
    variantes: [
      {
        kind: "FULL_BOTTLE",
        sizeMl: 50,
        priceArs: "229000.00",
        isActive: true,
      },
      { kind: "TESTER", sizeMl: 50, priceArs: "171000.00", isActive: true },
      { kind: "DECANT", sizeMl: 10, priceArs: "49000.00", isActive: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// Resolucion de referencias
// ---------------------------------------------------------------------------

type ReferenciaResuelta = Awaited<ReturnType<typeof resolverReferencia>>;

/**
 * Busca la FragranceRef que mejor matchea nombre + marca y devuelve la de
 * mayor ratingCount entre las candidatas (asi cae el buque insignia y no una
 * edicion limitada) junto con todo lo necesario para copiar su piramide.
 */
async function resolverReferencia(nombre: string, marca: string) {
  return prisma.fragranceRef.findFirst({
    where: {
      name: { contains: nombre, mode: "insensitive" },
      brand: { name: { contains: marca, mode: "insensitive" } },
    },
    // NULLS LAST implicito: las que no tienen rating quedan al final.
    orderBy: [{ ratingCount: { sort: "desc", nulls: "last" } }],
    select: {
      id: true,
      name: true,
      year: true,
      gender: true,
      ratingCount: true,
      brand: { select: { id: true, name: true } },
      notes: {
        orderBy: { sortOrder: "asc" },
        select: { noteId: true, position: true, sortOrder: true },
      },
      accords: {
        orderBy: { rank: "asc" },
        select: { accordId: true, rank: true },
      },
      perfumers: { select: { perfumerId: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Borrado (compartido por el flujo normal y por --limpiar)
// ---------------------------------------------------------------------------

/**
 * Borra el/los producto/s de dev que ya existan para esta referencia (deberia
 * ser a lo sumo uno, pero se contempla el caso de una corrida previa rota) y,
 * antes, sus objetos "productos/dev/" en R2 -- las claves que no tengan ese
 * prefijo son fotos reales subidas desde el panel y no se tocan.
 */
async function borrarProductoDev(
  fragranceRefId: string,
): Promise<{ productosBorrados: number; imagenesBorradas: number }> {
  const existentes = await prisma.product.findMany({
    where: { fragranceRefId },
    select: { id: true, images: { select: { storageKey: true } } },
  });
  if (existentes.length === 0) {
    return { productosBorrados: 0, imagenesBorradas: 0 };
  }

  let imagenesBorradas = 0;
  if (r2Configurado()) {
    for (const producto of existentes) {
      for (const imagen of producto.images) {
        if (!imagen.storageKey.startsWith("productos/dev/")) continue;
        try {
          await borrarObjeto(imagen.storageKey);
          imagenesBorradas++;
        } catch (err) {
          console.warn(
            `  aviso: no se pudo borrar ${imagen.storageKey} de R2 (${(err as Error).message})`,
          );
        }
      }
    }
  }

  await prisma.product.deleteMany({
    where: { id: { in: existentes.map((p) => p.id) } },
  });
  return { productosBorrados: existentes.length, imagenesBorradas };
}

// ---------------------------------------------------------------------------
// Subida de imagenes
// ---------------------------------------------------------------------------

async function subirImagen(clave: string, png: Buffer): Promise<void> {
  const url = await urlDeSubida({ clave, contentType: "image/png" });
  const respuesta = await fetch(url, {
    method: "PUT",
    // Buffer choca con el tipado de BodyInit del lib DOM del proyecto; una
    // vista Uint8Array plana es lo que fetch espera.
    body: new Uint8Array(png),
    headers: { "content-type": "image/png" },
  });
  if (!respuesta.ok) {
    throw new Error(
      `subida a R2 fallo (${respuesta.status}) para ${clave}: ${await respuesta.text()}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Creacion de un producto
// ---------------------------------------------------------------------------

async function crearProducto(
  cfg: ProductoDev,
  ref: NonNullable<ReferenciaResuelta>,
  indiceProducto: number,
): Promise<{
  variantes: number;
  notas: number;
  acordes: number;
  imagenes: number;
}> {
  const nombreBase = `${ref.brand.name} ${ref.name}`;
  const slugBase = aSlug(nombreBase);

  // Imagenes: solo los productos publicados las llevan (los borradores no se
  // muestran nunca en la tienda, no hace falta cargarlas).
  const imagenes: { storageKey: string; alt: string; isPrimary: boolean }[] =
    [];
  if (cfg.status === "PUBLISHED") {
    if (r2Configurado()) {
      const tamañoPrincipal =
        cfg.variantes.find((v) => v.kind === "FULL_BOTTLE")?.sizeMl ?? null;
      const alts = [
        tamañoPrincipal
          ? `${ref.name} de ${ref.brand.name}, frasco de ${tamañoPrincipal} ml`
          : `${ref.name} de ${ref.brand.name}, frasco`,
        `${ref.name} de ${ref.brand.name}, detalle de la etiqueta`,
        `${ref.name} de ${ref.brand.name}, frasco sobre fondo neutro`,
      ];
      for (let i = 0; i < 3; i++) {
        const clave = `productos/dev/${slugBase}-${i}.png`;
        const png = generarImagenFrasco(indiceProducto, i);
        await subirImagen(clave, png);
        imagenes.push({ storageKey: clave, alt: alts[i]!, isPrimary: i === 0 });
      }
    } else {
      console.log(
        `  aviso: R2 no esta configurado, "${ref.name}" se crea sin imagenes.`,
      );
    }
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const slug = await slugLibre(tx, nombreBase, null);

    const producto = await tx.product.create({
      data: {
        slug,
        name: ref.name,
        brandId: ref.brand.id,
        fragranceRefId: ref.id,
        description: cfg.description,
        gender: ref.gender ?? cfg.generoFallback,
        concentration: cfg.concentration,
        year: ref.year,
        seasons: cfg.seasons,
        occasions: cfg.occasions,
        longevity: cfg.longevity,
        sillage: cfg.sillage,
        intensity: cfg.intensity,
        status: cfg.status,
        isFeatured: cfg.isFeatured,
        notes: {
          createMany: {
            data: ref.notes.map((n) => ({
              noteId: n.noteId,
              position: n.position,
              sortOrder: n.sortOrder,
            })),
          },
        },
        accords: {
          createMany: {
            data: ref.accords.map((a, i) => ({
              accordId: a.accordId,
              sortOrder: i,
            })),
          },
        },
        perfumers: {
          createMany: {
            data: ref.perfumers.map((p) => ({ perfumerId: p.perfumerId })),
          },
        },
        variants: {
          createMany: {
            data: cfg.variantes.map((v, i) => ({
              kind: v.kind,
              sizeMl: v.sizeMl,
              priceArs: v.priceArs,
              isActive: v.isActive,
              sortOrder: i,
            })),
          },
        },
        images: {
          createMany: {
            data: imagenes.map((img, i) => ({
              storageKey: img.storageKey,
              alt: img.alt,
              isPrimary: img.isPrimary,
              sortOrder: i,
            })),
          },
        },
      },
      select: { id: true, slug: true },
    });

    return producto;
  });

  console.log(
    `  creado: ${resultado.slug} (${cfg.variantes.length} variantes, ${ref.notes.length} notas, ${ref.accords.length} acordes, ${imagenes.length} imagenes)`,
  );

  return {
    variantes: cfg.variantes.length,
    notas: ref.notes.length,
    acordes: ref.accords.length,
    imagenes: imagenes.length,
  };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const startedAt = Date.now();

  if (!r2Configurado()) {
    console.log(
      "Aviso: Cloudflare R2 no esta configurado (faltan variables R2_* en el env). Los productos publicados se crean sin imagenes.",
    );
  }

  if (modoLimpiar) {
    console.log("Modo --limpiar: borrando los productos de dev...\n");
    let productosBorrados = 0;
    let imagenesBorradas = 0;
    for (const cfg of PRODUCTOS_DEV) {
      const ref = await resolverReferencia(cfg.buscarNombre, cfg.buscarMarca);
      if (!ref) {
        console.log(
          `  aviso: no se encontro referencia para "${cfg.buscarNombre}" (${cfg.buscarMarca}), nada que borrar.`,
        );
        continue;
      }
      const r = await borrarProductoDev(ref.id);
      productosBorrados += r.productosBorrados;
      imagenesBorradas += r.imagenesBorradas;
      if (r.productosBorrados > 0) {
        console.log(
          `  borrado: ${ref.name} (${ref.brand.name}) — ${r.imagenesBorradas} imagenes de R2`,
        );
      }
    }
    console.log(
      `\nListo: ${fmt(productosBorrados)} productos borrados, ${fmt(imagenesBorradas)} imagenes eliminadas de R2.`,
    );
    return;
  }

  console.log("Resolviendo referencias...\n");

  let creados = 0;
  let noEncontrados = 0;
  let totalVariantes = 0;
  let totalNotas = 0;
  let totalAcordes = 0;
  let totalImagenes = 0;

  for (const [indiceProducto, cfg] of PRODUCTOS_DEV.entries()) {
    const ref = await resolverReferencia(cfg.buscarNombre, cfg.buscarMarca);
    if (!ref) {
      console.log(
        `  aviso: no se encontro ninguna referencia para "${cfg.buscarNombre}" (${cfg.buscarMarca}) — se omite.`,
      );
      noEncontrados++;
      continue;
    }
    console.log(
      `Referencia resuelta: "${ref.name}" (${ref.brand.name}, ${ref.year ?? "sin año"}, ${fmt(ref.ratingCount ?? 0)} votos) -> ${cfg.status}`,
    );

    // Idempotencia: se borra el producto de dev anterior (y sus imagenes en
    // R2) antes de crear el nuevo, igual que import-fragrantica.ts por pid.
    await borrarProductoDev(ref.id);

    const r = await crearProducto(cfg, ref, indiceProducto);
    creados++;
    totalVariantes += r.variantes;
    totalNotas += r.notas;
    totalAcordes += r.acordes;
    totalImagenes += r.imagenes;
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log("\nListo:");
  console.log(
    `  productos creados: ${fmt(creados)}/${fmt(PRODUCTOS_DEV.length)}`,
  );
  if (noEncontrados > 0) {
    console.log(`  referencias no encontradas: ${fmt(noEncontrados)}`);
  }
  console.log(`  variantes: ${fmt(totalVariantes)}`);
  console.log(`  notas copiadas: ${fmt(totalNotas)}`);
  console.log(`  acordes copiados: ${fmt(totalAcordes)}`);
  console.log(`  imagenes subidas a R2: ${fmt(totalImagenes)}`);
  console.log(`  tiempo: ${elapsed}s`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
