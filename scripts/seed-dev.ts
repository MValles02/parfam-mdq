/**
 * Development seed that adopts six real Fragrantica references already in the
 * database. It provides realistic data for testing the admin panel and store;
 * one stays DRAFT to verify that drafts cannot be accessed from the store.
 *
 *   pnpm exec dotenv -e .env -- pnpm exec tsx scripts/seed-dev.ts
 *   pnpm exec dotenv -e .env -- pnpm exec tsx scripts/seed-dev.ts --clean
 *
 * Idempotent: each development product is keyed by fragranceRefId instead of
 * the mutable slug. It deletes the matching existing product and its
 * "productos/dev/" R2 objects before creation, preventing duplicates. `--clean`
 * only deletes data. The legacy `--limpiar` option remains compatible.
 *
 * Notes, accords, and perfumers are copied exactly as the admin adoption flow
 * does. Descriptions are written in Spanish because Fragrantica text is never
 * published.
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
import { findAvailableSlug, toSlug } from "@/lib/admin/slug";
import { prisma } from "@/lib/db";
import { deleteR2Object, getUploadUrl, isR2Configured } from "@/lib/r2";

const { values } = parseArgs({
  options: {
    clean: { type: "boolean", default: false },
    limpiar: { type: "boolean", default: false },
  },
});
const cleanMode = values.clean === true || values.limpiar === true;

function fmt(n: number): string {
  return n.toLocaleString("es-AR");
}

// ---------------------------------------------------------------------------
// Small PNG encoder without dependencies: header plus one deflate-compressed
// IDAT chunk and a "none" filter on every row. It is sufficient for placeholder
// product photos.
// ---------------------------------------------------------------------------

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC32_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunkPng(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crc]);
}

const IMAGE_WIDTH = 1000;
const IMAGE_HEIGHT = 1250;

/** IMAGE_WIDTH x IMAGE_HEIGHT RGB canvas with helpers to paint rectangles. */
class Canvas {
  readonly pixels = Buffer.alloc(IMAGE_WIDTH * IMAGE_HEIGHT * 3);

  rect(x0: number, y0: number, x1: number, y1: number, colorHex: string) {
    const n = Number.parseInt(colorHex.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    const startY = Math.max(0, Math.round(y0));
    const endY = Math.min(IMAGE_HEIGHT, Math.round(y1));
    const startX = Math.max(0, Math.round(x0));
    const endX = Math.min(IMAGE_WIDTH, Math.round(x1));
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const i = (y * IMAGE_WIDTH + x) * 3;
        this.pixels[i] = r;
        this.pixels[i + 1] = g;
        this.pixels[i + 2] = b;
      }
    }
  }

  /** Filled rectangle with a `borderWidth` pixel border in `borderColor`. */
  rectangleWithBorder(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    fillColor: string,
    borderColor: string,
    borderWidth: number,
  ) {
    this.rect(x0, y0, x1, y1, borderColor);
    this.rect(
      x0 + borderWidth,
      y0 + borderWidth,
      x1 - borderWidth,
      y1 - borderWidth,
      fillColor,
    );
  }

  toPng(): Buffer {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(IMAGE_WIDTH, 0);
    ihdr.writeUInt32BE(IMAGE_HEIGHT, 4);
    ihdr[8] = 8; // 8 bits per channel
    ihdr[9] = 2; // color type 2: truecolor without alpha
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    const stride = IMAGE_WIDTH * 3;
    const raw = Buffer.alloc((stride + 1) * IMAGE_HEIGHT);
    for (let y = 0; y < IMAGE_HEIGHT; y++) {
      raw[y * (stride + 1)] = 0; // no filter
      this.pixels.copy(
        raw,
        y * (stride + 1) + 1,
        y * stride,
        y * stride + stride,
      );
    }
    const idat = deflateSync(raw);

    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunkPng("IHDR", ihdr),
      chunkPng("IDAT", idat),
      chunkPng("IEND", Buffer.alloc(0)),
    ]);
  }
}

const BACKGROUND_COLOR = "#FAF8F5";
const CAP_COLOR = "#DCD5CA";
const BODY_COLOR = "#E8E2D9";
const LABEL_COLOR = "#F2EEE9";

/**
 * Bottle silhouette base proportions as canvas fractions. Each product uses a
 * different silhouette so the six images do not look identical.
 */
type BottleSilhouette = {
  capWFrac: number;
  capHFrac: number;
  bodyWFrac: number;
  bodyHFrac: number;
  labelWFrac: number;
  labelHFrac: number;
  labelYFrac: number;
};

const BOTTLE_SILHOUETTES: BottleSilhouette[] = [
  // Sauvage Elixir: tall and narrow bottle.
  {
    capWFrac: 0.14,
    capHFrac: 0.09,
    bodyWFrac: 0.26,
    bodyHFrac: 0.5,
    labelWFrac: 0.7,
    labelHFrac: 0.22,
    labelYFrac: 0.35,
  },
  // Angel: wide cap (the star) and shorter body.
  {
    capWFrac: 0.3,
    capHFrac: 0.1,
    bodyWFrac: 0.32,
    bodyHFrac: 0.4,
    labelWFrac: 0.75,
    labelHFrac: 0.3,
    labelYFrac: 0.3,
  },
  // Tobacco Vanille: short and wide classic Tom Ford bottle.
  {
    capWFrac: 0.2,
    capHFrac: 0.07,
    bodyWFrac: 0.4,
    bodyHFrac: 0.34,
    labelWFrac: 0.65,
    labelHFrac: 0.35,
    labelYFrac: 0.32,
  },
  // La Vie Est Belle: medium body and rectangular rounded-cap approximation.
  {
    capWFrac: 0.18,
    capHFrac: 0.11,
    bodyWFrac: 0.3,
    bodyHFrac: 0.46,
    labelWFrac: 0.72,
    labelHFrac: 0.25,
    labelYFrac: 0.4,
  },
  // Le Male Elixir: a body that is wider at the top (sailor torso).
  {
    capWFrac: 0.16,
    capHFrac: 0.08,
    bodyWFrac: 0.34,
    bodyHFrac: 0.48,
    labelWFrac: 0.6,
    labelHFrac: 0.4,
    labelYFrac: 0.28,
  },
  // Coco Mademoiselle: flat, elegant rectangular bottle.
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

/** Framing for each of a product's three images. */
const IMAGE_FRAMES = [
  { scale: 1, offsetX: 0, offsetY: 0 }, // primary centered photo
  { scale: 1.22, offsetX: 40, offsetY: -30 }, // label close-up
  { scale: 0.82, offsetX: -60, offsetY: 40 }, // wider shifted shot
];

/**
 * Draws product `productIndex` (0-5, one silhouette per product) with image
 * `imageIndex` (0-2, one of the product's three images).
 */
function generateBottleImage(productIndex: number, imageIndex: number): Buffer {
  const silhouette =
    BOTTLE_SILHOUETTES[productIndex % BOTTLE_SILHOUETTES.length]!;
  const frame = IMAGE_FRAMES[imageIndex % IMAGE_FRAMES.length]!;
  const canvas = new Canvas();
  canvas.rect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT, BACKGROUND_COLOR);

  const centerX = IMAGE_WIDTH / 2;
  const baseY = IMAGE_HEIGHT - 190; // the bottle always rests at this height

  // Scale around the resting point so zooming keeps the bottle grounded.
  const tx = (x: number) =>
    centerX + (x - centerX) * frame.scale + frame.offsetX;
  const ty = (y: number) => baseY + (y - baseY) * frame.scale + frame.offsetY;

  const bodyW = silhouette.bodyWFrac * IMAGE_WIDTH;
  const bodyH = silhouette.bodyHFrac * IMAGE_HEIGHT;
  const capW = silhouette.capWFrac * IMAGE_WIDTH;
  const capH = silhouette.capHFrac * IMAGE_HEIGHT;

  const bodyX0 = centerX - bodyW / 2;
  const bodyX1 = centerX + bodyW / 2;
  const bodyY1 = baseY;
  const bodyY0 = bodyY1 - bodyH;

  const capX0 = centerX - capW / 2;
  const capX1 = centerX + capW / 2;
  const capY1 = bodyY0;
  const capY0 = capY1 - capH;

  const labelW = silhouette.labelWFrac * bodyW;
  const labelX0 = centerX - labelW / 2;
  const labelX1 = centerX + labelW / 2;
  const labelY0 = bodyY0 + silhouette.labelYFrac * bodyH;
  const labelY1 = labelY0 + silhouette.labelHFrac * bodyH;

  canvas.rectangleWithBorder(
    tx(bodyX0),
    ty(bodyY0),
    tx(bodyX1),
    ty(bodyY1),
    BODY_COLOR,
    CAP_COLOR,
    Math.max(2, Math.round(6 * frame.scale)),
  );
  canvas.rect(tx(capX0), ty(capY0), tx(capX1), ty(capY1), CAP_COLOR);
  canvas.rect(tx(labelX0), ty(labelY0), tx(labelX1), ty(labelY1), LABEL_COLOR);

  return canvas.toPng();
}

// ---------------------------------------------------------------------------
// Six development products configuration
// ---------------------------------------------------------------------------

type DevelopmentVariant = {
  kind: VariantKind;
  sizeMl: number | null;
  priceArs: string;
  isActive: boolean;
};

type DevelopmentProduct = {
  searchName: string;
  searchBrand: string;
  concentration: Concentration;
  fallbackGender: Gender;
  status: ProductStatus;
  description: string;
  seasons: Season[];
  occasions: Occasion[];
  longevity: number;
  sillage: number;
  intensity: number;
  isFeatured: boolean;
  variants: DevelopmentVariant[];
};

const DEVELOPMENT_PRODUCTS: DevelopmentProduct[] = [
  {
    searchName: "Sauvage Elixir",
    searchBrand: "Dior",
    concentration: "PARFUM",
    fallbackGender: "MEN",
    status: "PUBLISHED",
    description:
      "Un elixir pensado para la noche: apenas te lo ponés pegan las especias bien fuerte y después se instala un fondo amaderado que se queda horas. Rinde muchísimo, con dos pulsos alcanza y sobra. Si buscás algo que se note sin exagerar en la cantidad, es de los más seguros que tenemos.",
    seasons: ["FALL", "WINTER"],
    occasions: ["NIGHT", "FORMAL"],
    longevity: 5,
    sillage: 5,
    intensity: 5,
    isFeatured: true,
    variants: [
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
    searchName: "Angel",
    searchBrand: "Mugler",
    concentration: "EAU_DE_PARFUM",
    fallbackGender: "WOMEN",
    status: "PUBLISHED",
    description:
      "Un clásico que se ama o se odia, no hay término medio: dulce a caramelo con un fondo de pachulí que lo vuelve gourmand pero nada empalagoso. Va perfecto para el frío, cuando el ambiente pide algo más envolvente. Si nunca lo probaste, arrancá por el decant antes de ir al frasco entero.",
    seasons: ["WINTER"],
    occasions: ["NIGHT"],
    longevity: 5,
    sillage: 4,
    intensity: 4,
    isFeatured: false,
    variants: [
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
    searchName: "Tobacco Vanille",
    searchBrand: "Tom Ford",
    concentration: "EAU_DE_PARFUM",
    fallbackGender: "UNISEX",
    status: "PUBLISHED",
    description:
      "Tabaco dulce con vainilla y un toque especiado, ideal para el otoño-invierno. Es de los que dejan estela sin ser invasivo, perfecto para una cena o una juntada de noche. Unisex de verdad: no tiene ese perfil marcadamente masculino ni femenino.",
    seasons: ["FALL", "WINTER"],
    occasions: ["NIGHT", "CASUAL"],
    longevity: 4,
    sillage: 3,
    intensity: 3,
    isFeatured: true,
    variants: [
      {
        kind: "FULL_BOTTLE",
        sizeMl: 50,
        priceArs: "275000.00",
        isActive: true,
      },
      // This only inactive variant lets the mockup show the out-of-stock state.
      { kind: "TESTER", sizeMl: 50, priceArs: "206000.00", isActive: false },
      { kind: "DECANT", sizeMl: 10, priceArs: "58000.00", isActive: true },
    ],
  },
  {
    searchName: "La Vie Est Belle",
    searchBrand: "Lancome",
    concentration: "EAU_DE_PARFUM",
    fallbackGender: "WOMEN",
    status: "PUBLISHED",
    description:
      "Floral gourmand con ese toque de iris y praliné que lo hizo un básico en cualquier perfumero. Anda bien de día y de noche, con una proyección moderada que no cansa. Si te gustan los dulces sin que empalaguen, este es de los más pedidos.",
    seasons: ["SPRING", "SUMMER"],
    occasions: ["DAY", "CASUAL"],
    longevity: 3,
    sillage: 3,
    intensity: 2,
    isFeatured: false,
    variants: [
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
    searchName: "Le Male Elixir",
    searchBrand: "Jean Paul Gaultier",
    concentration: "PARFUM",
    fallbackGender: "MEN",
    status: "PUBLISHED",
    description:
      "La versión más concentrada del clásico Le Male: lavanda, vainilla y haba tonka en una fórmula bien potente. Ideal para salidas nocturnas donde querés que se note desde lejos. El frasco es el de siempre, el del torso marinero, pero con mucho más carácter adentro.",
    seasons: ["FALL", "WINTER"],
    occasions: ["NIGHT", "FORMAL"],
    longevity: 5,
    sillage: 5,
    intensity: 4,
    isFeatured: false,
    variants: [
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
    searchName: "Coco Mademoiselle",
    searchBrand: "Chanel",
    concentration: "EAU_DE_PARFUM",
    fallbackGender: "WOMEN",
    // This draft verifies that the store does not display a product even when
    // variants and a description are already available.
    status: "DRAFT",
    description:
      "Cítricos frescos al principio y un fondo de pachulí y vainilla que se instala después de un rato. Elegante sin ser pesado, de los que sirven tanto para la oficina como para salir. Queda en borrador hasta que carguemos las fotos definitivas.",
    seasons: ["SPRING", "SUMMER", "FALL"],
    occasions: ["DAY", "FORMAL"],
    longevity: 4,
    sillage: 2,
    intensity: 2,
    isFeatured: false,
    variants: [
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
// Reference resolution
// ---------------------------------------------------------------------------

type ResolvedReference = Awaited<ReturnType<typeof findReference>>;

/**
 * Finds the FragranceRef matching a name and brand, choosing the candidate with
 * the highest ratingCount to select the flagship instead of a limited edition.
 */
async function findReference(name: string, brand: string) {
  return prisma.fragranceRef.findFirst({
    where: {
      name: { contains: name, mode: "insensitive" },
      brand: { name: { contains: brand, mode: "insensitive" } },
    },
    // Null ratings sort last.
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
// Deletion shared by normal execution and --clean
// ---------------------------------------------------------------------------

/**
 * Deletes existing development products for this reference, including their
 * "productos/dev/" R2 objects. Keys outside that prefix are real panel uploads
 * and must remain untouched.
 */
async function deleteDevelopmentProduct(
  fragranceRefId: string,
): Promise<{ deletedProducts: number; deletedImages: number }> {
  const existingProducts = await prisma.product.findMany({
    where: { fragranceRefId },
    select: { id: true, images: { select: { storageKey: true } } },
  });
  if (existingProducts.length === 0) {
    return { deletedProducts: 0, deletedImages: 0 };
  }

  let deletedImages = 0;
  if (isR2Configured()) {
    for (const product of existingProducts) {
      for (const image of product.images) {
        if (!image.storageKey.startsWith("productos/dev/")) continue;
        try {
          await deleteR2Object(image.storageKey);
          deletedImages++;
        } catch (err) {
          console.warn(
            `  warning: could not delete R2 object ${image.storageKey} (${(err as Error).message})`,
          );
        }
      }
    }
  }

  await prisma.product.deleteMany({
    where: { id: { in: existingProducts.map((product) => product.id) } },
  });
  return { deletedProducts: existingProducts.length, deletedImages };
}

// ---------------------------------------------------------------------------
// Image uploads
// ---------------------------------------------------------------------------

async function uploadImage(key: string, png: Buffer): Promise<void> {
  const uploadUrl = await getUploadUrl({ key, contentType: "image/png" });
  const response = await fetch(uploadUrl, {
    method: "PUT",
    // Buffer conflicts with the project's DOM BodyInit type. A plain Uint8Array
    // view is what fetch expects.
    body: new Uint8Array(png),
    headers: { "content-type": "image/png" },
  });
  if (!response.ok) {
    throw new Error(
      `R2 upload failed (${response.status}) for ${key}: ${await response.text()}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Product creation
// ---------------------------------------------------------------------------

async function createProduct(
  config: DevelopmentProduct,
  reference: NonNullable<ResolvedReference>,
  productIndex: number,
): Promise<{
  variants: number;
  notes: number;
  accords: number;
  images: number;
}> {
  const baseName = `${reference.brand.name} ${reference.name}`;
  const baseSlug = toSlug(baseName);

  // Only published products need images because the store never renders drafts.
  const images: { storageKey: string; alt: string; isPrimary: boolean }[] = [];
  if (config.status === "PUBLISHED") {
    if (isR2Configured()) {
      const primarySize =
        config.variants.find((variant) => variant.kind === "FULL_BOTTLE")
          ?.sizeMl ?? null;
      const alts = [
        primarySize
          ? `${reference.name} de ${reference.brand.name}, frasco de ${primarySize} ml`
          : `${reference.name} de ${reference.brand.name}, frasco`,
        `${reference.name} de ${reference.brand.name}, detalle de la etiqueta`,
        `${reference.name} de ${reference.brand.name}, frasco sobre fondo neutro`,
      ];
      for (let i = 0; i < 3; i++) {
        const key = `productos/dev/${baseSlug}-${i}.png`;
        const png = generateBottleImage(productIndex, i);
        await uploadImage(key, png);
        images.push({ storageKey: key, alt: alts[i]!, isPrimary: i === 0 });
      }
    } else {
      console.log(
        `  warning: R2 is not configured; creating "${reference.name}" without images.`,
      );
    }
  }

  const product = await prisma.$transaction(async (tx) => {
    const slug = await findAvailableSlug(tx, baseName, null);

    const createdProduct = await tx.product.create({
      data: {
        slug,
        name: reference.name,
        brandId: reference.brand.id,
        fragranceRefId: reference.id,
        description: config.description,
        gender: reference.gender ?? config.fallbackGender,
        concentration: config.concentration,
        year: reference.year,
        seasons: config.seasons,
        occasions: config.occasions,
        longevity: config.longevity,
        sillage: config.sillage,
        intensity: config.intensity,
        status: config.status,
        isFeatured: config.isFeatured,
        notes: {
          createMany: {
            data: reference.notes.map((note) => ({
              noteId: note.noteId,
              position: note.position,
              sortOrder: note.sortOrder,
            })),
          },
        },
        accords: {
          createMany: {
            data: reference.accords.map((accord, index) => ({
              accordId: accord.accordId,
              sortOrder: index,
            })),
          },
        },
        perfumers: {
          createMany: {
            data: reference.perfumers.map((perfumer) => ({
              perfumerId: perfumer.perfumerId,
            })),
          },
        },
        variants: {
          createMany: {
            data: config.variants.map((variant, index) => ({
              kind: variant.kind,
              sizeMl: variant.sizeMl,
              priceArs: variant.priceArs,
              isActive: variant.isActive,
              sortOrder: index,
            })),
          },
        },
        images: {
          createMany: {
            data: images.map((image, index) => ({
              storageKey: image.storageKey,
              alt: image.alt,
              isPrimary: image.isPrimary,
              sortOrder: index,
            })),
          },
        },
      },
      select: { id: true, slug: true },
    });

    return createdProduct;
  });

  console.log(
    `  created: ${product.slug} (${config.variants.length} variants, ${reference.notes.length} notes, ${reference.accords.length} accords, ${images.length} images)`,
  );

  return {
    variants: config.variants.length,
    notes: reference.notes.length,
    accords: reference.accords.length,
    images: images.length,
  };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const startedAt = Date.now();

  if (!isR2Configured()) {
    console.log(
      "Warning: Cloudflare R2 is not configured (R2_* environment variables are missing). Published products will be created without images.",
    );
  }

  if (cleanMode) {
    console.log("Clean mode: deleting development products...\n");
    let deletedProducts = 0;
    let deletedImages = 0;
    for (const config of DEVELOPMENT_PRODUCTS) {
      const reference = await findReference(
        config.searchName,
        config.searchBrand,
      );
      if (!reference) {
        console.log(
          `  warning: no reference found for "${config.searchName}" (${config.searchBrand}); nothing to delete.`,
        );
        continue;
      }
      const result = await deleteDevelopmentProduct(reference.id);
      deletedProducts += result.deletedProducts;
      deletedImages += result.deletedImages;
      if (result.deletedProducts > 0) {
        console.log(
          `  deleted: ${reference.name} (${reference.brand.name}) — ${result.deletedImages} R2 images`,
        );
      }
    }
    console.log(
      `\nDone: ${fmt(deletedProducts)} deleted products and ${fmt(deletedImages)} deleted R2 images.`,
    );
    return;
  }

  console.log("Resolving references...\n");

  let created = 0;
  let notFound = 0;
  let totalVariants = 0;
  let totalNotes = 0;
  let totalAccords = 0;
  let totalImages = 0;

  for (const [productIndex, config] of DEVELOPMENT_PRODUCTS.entries()) {
    const reference = await findReference(
      config.searchName,
      config.searchBrand,
    );
    if (!reference) {
      console.log(
        `  warning: no reference found for "${config.searchName}" (${config.searchBrand}); skipping.`,
      );
      notFound++;
      continue;
    }
    console.log(
      `Resolved reference: "${reference.name}" (${reference.brand.name}, ${reference.year ?? "no year"}, ${fmt(reference.ratingCount ?? 0)} votes) -> ${config.status}`,
    );

    // Delete the prior development product and its R2 images before creating
    // the replacement, mirroring import-fragrantica.ts PID behavior.
    await deleteDevelopmentProduct(reference.id);

    const result = await createProduct(config, reference, productIndex);
    created++;
    totalVariants += result.variants;
    totalNotes += result.notes;
    totalAccords += result.accords;
    totalImages += result.images;
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log("\nDone:");
  console.log(
    `  created products: ${fmt(created)}/${fmt(DEVELOPMENT_PRODUCTS.length)}`,
  );
  if (notFound > 0) {
    console.log(`  references not found: ${fmt(notFound)}`);
  }
  console.log(`  variants: ${fmt(totalVariants)}`);
  console.log(`  copied notes: ${fmt(totalNotes)}`);
  console.log(`  copied accords: ${fmt(totalAccords)}`);
  console.log(`  images uploaded to R2: ${fmt(totalImages)}`);
  console.log(`  elapsed: ${elapsed}s`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
