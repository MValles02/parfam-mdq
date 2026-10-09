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
import { Gender, ProductStatus, VariantKind } from "@/generated/prisma/enums";
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

    for (const fixture of FIXTURE_PRODUCTS) {
      const brandId = brandIdBySlug.get(fixture.brandSlug);
      if (!brandId) {
        throw new Error(`Unknown fixture brand slug: ${fixture.brandSlug}`);
      }

      await prisma.$transaction(async (tx) => {
        const fields = {
          name: fixture.name,
          brandId,
          gender: fixture.gender,
          status: fixture.status,
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
        if (
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
