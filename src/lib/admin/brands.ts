import { prisma } from "@/lib/db";

export type BrandRow = {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  productCount: number;
};

/**
 * The Fragrantica dataset has 1,748 brands, while only a few currently have
 * store products. Without `q`, this limits the list to relevant brands. With
 * `q`, it searches the whole reference set so a brand can be corrected before
 * its first product is added.
 */
export async function listBrands(
  q: string,
  filtro: "todas" | "sin-corregir" = "todas",
): Promise<BrandRow[]> {
  const query = q.trim();

  const brands = await prisma.brand.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { slug: { contains: query, mode: "insensitive" } },
          ],
        }
      : { products: { some: {} } },
    orderBy: { name: "asc" },
    take: query ? 50 : undefined,
    select: {
      id: true,
      slug: true,
      name: true,
      country: true,
      _count: { select: { products: true } },
    },
  });

  const rows = brands.map((brand) => ({
    id: brand.id,
    slug: brand.slug,
    name: brand.name,
    country: brand.country,
    productCount: brand._count.products,
  }));

  // A brand whose name still equals its slug was never corrected after the
  // reference import. Prisma cannot compare two columns, so filter in JS.
  return filtro === "sin-corregir"
    ? rows.filter((brand) => brand.name === brand.slug)
    : rows;
}

/** Brands with store products whose displayed name is still the raw slug. */
export async function countUncorrectedBrands(): Promise<number> {
  const brands = await prisma.brand.findMany({
    where: { products: { some: {} } },
    select: { name: true, slug: true },
  });
  return brands.filter((brand) => brand.name === brand.slug).length;
}
