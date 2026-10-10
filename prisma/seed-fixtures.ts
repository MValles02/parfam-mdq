/**
 * Development-only fixture catalog: brands, products, and variants that
 * exercise real store pages for local smoke checks and E2E specs (a "desde" /
 * starting price product, a draft that must 404, and a published product with
 * no purchasable variant). Every row's slug is prefixed "fixture-" so it can
 * be told apart from real catalog data. The products' slugs and names live in
 * scripts/lib/fixture-catalog.ts, shared with scripts/smoke.ts and e2e/.
 *
 *   pnpm db:seed:fixtures
 *
 * Refuses to run against anything but a local database (see
 * `assertLocalDatabase` below), so it can never seed fake data in
 * production. Run `pnpm db:seed` first if you also want the admin user.
 *
 * Idempotent: brands and products are upserted by slug, and each fixture
 * product's variants are deleted and recreated inside a transaction, so
 * rerunning does not duplicate rows.
 */
import "dotenv/config";
import { Prisma } from "@/generated/prisma/client";
import {
  Concentration,
  Gender,
  NotePosition,
  ProductStatus,
  VariantKind,
} from "@/generated/prisma/enums";
import {
  FIXTURE_DRAFT,
  FIXTURE_INACTIVE_ONLY,
  FIXTURE_LISTED,
  FIXTURE_MEN,
  FIXTURE_UNISEX,
  FIXTURE_WOMEN,
} from "../scripts/lib/fixture-catalog";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);
const LOCAL_ONLY_REASON =
  "it seeds fake catalog data for local smoke checks only.";

function exitWithError(message: string): never {
  console.error(message);
  process.exit(1);
}

/**
 * Guards against ever seeding this fake catalog into a real deployment: it
 * checks NODE_ENV and the DATABASE_URL hostname before importing anything
 * that would open a database connection.
 */
function assertLocalDatabase() {
  if (process.env.NODE_ENV === "production") {
    exitWithError(
      `db:seed:fixtures refuses to run with NODE_ENV=production; ${LOCAL_ONLY_REASON}`,
    );
  }

  const raw = process.env.DATABASE_URL;
  if (!raw) {
    exitWithError("db:seed:fixtures: DATABASE_URL is not set.");
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    exitWithError("db:seed:fixtures: DATABASE_URL is not a valid URL.");
  }

  // pg-connection-string (used by pg via @prisma/adapter-pg) takes the real
  // connection host from a `host`/`hostaddr` query param when present,
  // overriding the URL's own hostname; reject either outright so a URL like
  // "postgresql://u@localhost/db?host=prod.example.com" can't slip past the
  // hostname check below and connect elsewhere.
  if (url.searchParams.has("host") || url.searchParams.has("hostaddr")) {
    exitWithError(
      `db:seed:fixtures refuses a DATABASE_URL with a host/hostaddr query param; ${LOCAL_ONLY_REASON}`,
    );
  }

  // Strip IPv6 brackets ("[::1]") so it compares against LOCAL_HOSTNAMES.
  const hostname = url.hostname.replace(/^\[|\]$/g, "");

  if (!LOCAL_HOSTNAMES.has(hostname)) {
    exitWithError(
      `db:seed:fixtures refuses to run against a non-local DATABASE_URL host (${hostname}); ${LOCAL_ONLY_REASON}`,
    );
  }
}

type FixtureVariant = {
  kind: VariantKind;
  sizeMl: number;
  priceArs: string;
  isActive: boolean;
};

type FixtureProduct = {
  slug: string;
  name: string;
  brandSlug: string;
  gender: Gender;
  status: ProductStatus;
  variants: FixtureVariant[];
};

const FIXTURE_BRAND_A = {
  slug: "fixture-brand-a",
  name: "Fixture Casa de Perfumes A",
};
const FIXTURE_BRAND_B = {
  slug: "fixture-brand-b",
  name: "Fixture Casa de Perfumes B",
};
const FIXTURE_BRANDS = [FIXTURE_BRAND_A, FIXTURE_BRAND_B];

const FIXTURE_PRODUCTS: FixtureProduct[] = [
  {
    // Two active variants at different prices exercise the "desde" /
    // starting-price logic in src/lib/catalog.ts (getStartingPrice).
    ...FIXTURE_WOMEN,
    brandSlug: FIXTURE_BRAND_A.slug,
    gender: Gender.WOMEN,
    status: ProductStatus.PUBLISHED,
    variants: [
      {
        kind: VariantKind.FULL_BOTTLE,
        sizeMl: 100,
        priceArs: "45000.00",
        isActive: true,
      },
      {
        kind: VariantKind.DECANT,
        sizeMl: 5,
        priceArs: "8000.00",
        isActive: true,
      },
    ],
  },
  {
    ...FIXTURE_MEN,
    brandSlug: FIXTURE_BRAND_B.slug,
    gender: Gender.MEN,
    status: ProductStatus.PUBLISHED,
    variants: [
      {
        kind: VariantKind.FULL_BOTTLE,
        sizeMl: 100,
        priceArs: "30000.00",
        isActive: true,
      },
      {
        // Legacy row: the store must hide it and refuse to sell it.
        kind: VariantKind.TESTER,
        sizeMl: 100,
        priceArs: "30000.00",
        isActive: true,
      },
    ],
  },
  {
    ...FIXTURE_UNISEX,
    brandSlug: FIXTURE_BRAND_A.slug,
    gender: Gender.UNISEX,
    status: ProductStatus.PUBLISHED,
    variants: [
      {
        kind: VariantKind.FULL_BOTTLE,
        sizeMl: 50,
        priceArs: "25000.00",
        isActive: true,
      },
    ],
  },
  {
    // Draft product: the store must 404 this slug.
    ...FIXTURE_DRAFT,
    brandSlug: FIXTURE_BRAND_B.slug,
    gender: Gender.UNISEX,
    status: ProductStatus.DRAFT,
    variants: [
      {
        kind: VariantKind.FULL_BOTTLE,
        sizeMl: 50,
        priceArs: "20000.00",
        isActive: true,
      },
    ],
  },
  {
    // Published but its only variant is inactive: the store must not offer
    // it for purchase.
    ...FIXTURE_INACTIVE_ONLY,
    brandSlug: FIXTURE_BRAND_A.slug,
    gender: Gender.WOMEN,
    status: ProductStatus.PUBLISHED,
    variants: [
      {
        kind: VariantKind.FULL_BOTTLE,
        sizeMl: 100,
        priceArs: "40000.00",
        isActive: false,
      },
    ],
  },
];

// One accord shared by the published fixtures, so the "Se parece a" ranking has
// something to match on; the gender rule then decides which products qualify.
const FIXTURE_ACCORD = {
  slug: "fixture-amaderado",
  nameEn: "Fixture Woody",
  nameEs: "Fixture Amaderado",
  color: "#8B5A2B",
};

type Tiered = { position: NotePosition; slug: string; es: string; en: string };

// Rich content for two listed fixtures so the product page (accord bars, note
// pyramid, key facts), the concentration link, and the publish checklist can be
// checked against fixtures. The other fixtures stay bare on purpose.
const FIXTURE_DETAILS: Record<
  string,
  {
    description: string;
    concentration: Concentration;
    accords: {
      slug: string;
      en: string;
      es: string;
      color: string;
      strength: number;
    }[];
    notes: Tiered[];
  }
> = {
  [FIXTURE_WOMEN.slug]: {
    description:
      "Una fragancia floral y luminosa, pensada para el día a día. Abre con cítricos frescos, se vuelve cremosa en el corazón y deja una estela suave de maderas y almizcle.",
    concentration: Concentration.EAU_DE_PARFUM,
    accords: [
      {
        slug: "fixture-floral",
        en: "Fixture Floral",
        es: "Fixture Floral",
        color: "#E58FB1",
        strength: 100,
      },
      {
        slug: "fixture-citrico",
        en: "Fixture Citrus",
        es: "Fixture Cítrico",
        color: "#F2C230",
        strength: 80,
      },
      {
        slug: "fixture-almizclado",
        en: "Fixture Musky",
        es: "Fixture Almizclado",
        color: "#C9B8D9",
        strength: 60,
      },
      {
        slug: "fixture-amaderado",
        en: "Fixture Woody",
        es: "Fixture Amaderado",
        color: "#8B5A2B",
        strength: 45,
      },
    ],
    notes: [
      {
        position: NotePosition.TOP,
        slug: "fixture-bergamota",
        en: "Fixture Bergamot",
        es: "Fixture Bergamota",
      },
      {
        position: NotePosition.TOP,
        slug: "fixture-mandarina",
        en: "Fixture Mandarin",
        es: "Fixture Mandarina",
      },
      {
        position: NotePosition.MIDDLE,
        slug: "fixture-jazmin",
        en: "Fixture Jasmine",
        es: "Fixture Jazmín",
      },
      {
        position: NotePosition.MIDDLE,
        slug: "fixture-rosa",
        en: "Fixture Rose",
        es: "Fixture Rosa",
      },
      {
        position: NotePosition.BASE,
        slug: "fixture-almizcle",
        en: "Fixture Musk",
        es: "Fixture Almizcle",
      },
      {
        position: NotePosition.BASE,
        slug: "fixture-cedro",
        en: "Fixture Cedar",
        es: "Fixture Cedro",
      },
    ],
  },
  [FIXTURE_MEN.slug]: {
    description:
      "Un aromático fresco con carácter. Arranca con cítricos y lavanda, sigue con especias suaves y cierra con un fondo amaderado y ambarado de buena duración.",
    concentration: Concentration.EAU_DE_TOILETTE,
    accords: [
      {
        slug: "fixture-amaderado",
        en: "Fixture Woody",
        es: "Fixture Amaderado",
        color: "#8B5A2B",
        strength: 100,
      },
      {
        slug: "fixture-citrico",
        en: "Fixture Citrus",
        es: "Fixture Cítrico",
        color: "#F2C230",
        strength: 75,
      },
      {
        slug: "fixture-aromatico",
        en: "Fixture Aromatic",
        es: "Fixture Aromático",
        color: "#5E8C61",
        strength: 60,
      },
    ],
    notes: [
      {
        position: NotePosition.TOP,
        slug: "fixture-bergamota",
        en: "Fixture Bergamot",
        es: "Fixture Bergamota",
      },
      {
        position: NotePosition.TOP,
        slug: "fixture-lavanda",
        en: "Fixture Lavender",
        es: "Fixture Lavanda",
      },
      {
        position: NotePosition.MIDDLE,
        slug: "fixture-pimienta",
        en: "Fixture Pepper",
        es: "Fixture Pimienta",
      },
      {
        position: NotePosition.BASE,
        slug: "fixture-cedro",
        en: "Fixture Cedar",
        es: "Fixture Cedro",
      },
      {
        position: NotePosition.BASE,
        slug: "fixture-ambar",
        en: "Fixture Amber",
        es: "Fixture Ámbar",
      },
    ],
  },
};

// Reference-catalog fixture, linked to no product, so admin reference search
// and the adopt-a-reference flow have a row to work with. The pid is fictional
// and far above any real dataset id.
const FIXTURE_REF = {
  pid: 999000001,
  slug: "fixture-brand-a/fixture-referencia-de-prueba",
  name: "Fixture Referencia de Prueba",
  accordSlug: "fixture-floral",
  noteSlugs: ["fixture-bergamota", "fixture-jazmin", "fixture-cedro"],
};

async function main() {
  assertLocalDatabase();

  // Imported only after the guard above passes, so a rejected run never
  // opens a database connection.
  const { prisma } = await import("@/lib/db");

  try {
    const brandIdBySlug = new Map<string, string>();
    for (const brand of FIXTURE_BRANDS) {
      const row = await prisma.brand.upsert({
        where: { slug: brand.slug },
        create: brand,
        update: { name: brand.name },
      });
      brandIdBySlug.set(brand.slug, row.id);
    }

    const accord = await prisma.accord.upsert({
      where: { slug: FIXTURE_ACCORD.slug },
      create: FIXTURE_ACCORD,
      update: FIXTURE_ACCORD,
    });

    const accordIdBySlug = new Map<string, string>([[accord.slug, accord.id]]);
    const noteIdBySlug = new Map<string, string>();
    for (const detail of Object.values(FIXTURE_DETAILS)) {
      for (const a of detail.accords) {
        if (accordIdBySlug.has(a.slug)) continue;
        const data = { nameEn: a.en, nameEs: a.es, color: a.color };
        const row = await prisma.accord.upsert({
          where: { slug: a.slug },
          create: { slug: a.slug, ...data },
          update: data,
        });
        accordIdBySlug.set(a.slug, row.id);
      }
      for (const n of detail.notes) {
        if (noteIdBySlug.has(n.slug)) continue;
        const data = { nameEn: n.en, nameEs: n.es, family: n.slug };
        const row = await prisma.note.upsert({
          where: { slug: n.slug },
          create: { slug: n.slug, ...data },
          update: data,
        });
        noteIdBySlug.set(n.slug, row.id);
      }
    }

    const refBrandId = brandIdBySlug.get(FIXTURE_BRAND_A.slug)!;
    const refFields = {
      slug: FIXTURE_REF.slug,
      brandId: refBrandId,
      name: FIXTURE_REF.name,
      year: 2020,
      gender: Gender.UNISEX,
      descriptionEn:
        "Fictional reference entry used only by local fixtures and E2E specs.",
      popularity: 1000,
      // Same "<name> <brand>" shape the importer writes.
      searchText: `${FIXTURE_REF.name} ${FIXTURE_BRAND_A.name}`,
    };
    const ref = await prisma.fragranceRef.upsert({
      where: { pid: FIXTURE_REF.pid },
      create: { pid: FIXTURE_REF.pid, ...refFields },
      update: refFields,
    });
    await prisma.$transaction([
      prisma.fragranceRefNote.deleteMany({ where: { fragranceRefId: ref.id } }),
      prisma.fragranceRefAccord.deleteMany({
        where: { fragranceRefId: ref.id },
      }),
      prisma.fragranceRefNote.createMany({
        data: FIXTURE_REF.noteSlugs.map((slug, index) => ({
          fragranceRefId: ref.id,
          noteId: noteIdBySlug.get(slug)!,
          position: [NotePosition.TOP, NotePosition.MIDDLE, NotePosition.BASE][
            index
          ],
          weight: 100 - index * 20,
          sortOrder: index,
        })),
      }),
      prisma.fragranceRefAccord.create({
        data: {
          fragranceRefId: ref.id,
          accordId: accordIdBySlug.get(FIXTURE_REF.accordSlug)!,
          strength: 100,
        },
      }),
    ]);

    for (const fixture of FIXTURE_PRODUCTS) {
      const brandId = brandIdBySlug.get(fixture.brandSlug);
      if (!brandId) {
        throw new Error(`Unknown fixture brand slug: ${fixture.brandSlug}`);
      }

      const detail = FIXTURE_DETAILS[fixture.slug];
      await prisma.$transaction(async (tx) => {
        const fields = {
          name: fixture.name,
          brandId,
          gender: fixture.gender,
          status: fixture.status,
          ...(detail && {
            description: detail.description,
            concentration: detail.concentration,
          }),
        };
        const product = await tx.product.upsert({
          where: { slug: fixture.slug },
          create: { slug: fixture.slug, ...fields },
          update: fields,
        });

        // Replacing variants outright is simpler than diffing them and is
        // safe here: fixture products are never referenced by real orders.
        await tx.productVariant.deleteMany({
          where: { productId: product.id },
        });
        await tx.productVariant.createMany({
          data: fixture.variants.map((variant, index) => ({
            productId: product.id,
            kind: variant.kind,
            sizeMl: variant.sizeMl,
            priceArs: new Prisma.Decimal(variant.priceArs),
            isActive: variant.isActive,
            sortOrder: index,
          })),
        });

        await tx.productAccord.deleteMany({ where: { productId: product.id } });
        await tx.productNote.deleteMany({ where: { productId: product.id } });
        if (detail) {
          await tx.productAccord.createMany({
            data: detail.accords.map((a, index) => ({
              productId: product.id,
              accordId: accordIdBySlug.get(a.slug)!,
              strength: a.strength,
              sortOrder: index,
            })),
          });
          await tx.productNote.createMany({
            data: detail.notes.map((n, index) => ({
              productId: product.id,
              noteId: noteIdBySlug.get(n.slug)!,
              position: n.position,
              weight: 100 - index * 10,
              sortOrder: index,
            })),
          });
        } else if (
          FIXTURE_LISTED.some((listed) => listed.slug === fixture.slug)
        ) {
          await tx.productAccord.create({
            data: { productId: product.id, accordId: accord.id, strength: 100 },
          });
        }
      });
    }

    console.log("Fixture catalog is ready.");
    console.log(
      `Published slugs: ${FIXTURE_LISTED.map((fixture) => fixture.slug).join(", ")}`,
    );
    console.log(
      `With description, concentration, accords and notes: ${Object.keys(FIXTURE_DETAILS).join(", ")}`,
    );
    console.log(
      `Unadopted reference (pid ${FIXTURE_REF.pid}): ${FIXTURE_REF.name}`,
    );
    console.log(`Draft slug (must 404 in the store): ${FIXTURE_DRAFT.slug}`);
    console.log(
      `Published, inactive-only variant slug: ${FIXTURE_INACTIVE_ONLY.slug}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
