/**
 * Slugs and display names of the dev-only fixture products that
 * prisma/seed-fixtures.ts seeds and that scripts/smoke.ts and the e2e/ specs
 * visit and assert on. They live apart from the seed because importing
 * prisma/seed-fixtures.ts runs it: it writes to the database and can
 * process.exit() the caller for a non-local DATABASE_URL.
 */

/** Two active variants at different prices: exercises the "desde" starting price. */
export const FIXTURE_WOMEN = {
  slug: "fixture-eau-de-prueba-mujer",
  name: "Fixture Eau de Prueba Mujer",
} as const;

export const FIXTURE_MEN = {
  slug: "fixture-eau-de-prueba-hombre",
  name: "Fixture Eau de Prueba Hombre",
} as const;

export const FIXTURE_UNISEX = {
  slug: "fixture-eau-de-prueba-unisex",
  name: "Fixture Eau de Prueba Unisex",
} as const;

/** Draft product: the store must 404 its slug and never list it. */
export const FIXTURE_DRAFT = {
  slug: "fixture-borrador",
  name: "Fixture Eau de Prueba Borrador",
} as const;

/**
 * Published, but its only variant is inactive: its page still renders (it is
 * not a draft), yet the catalog never lists it and it is never offered for
 * purchase.
 */
export const FIXTURE_INACTIVE_ONLY = {
  slug: "fixture-solo-inactivo",
  name: "Fixture Eau de Prueba Sin Stock",
} as const;

/** Published fixtures with an active variant, the ones the catalog lists, in seeding order. */
export const FIXTURE_LISTED = [FIXTURE_WOMEN, FIXTURE_MEN, FIXTURE_UNISEX];
