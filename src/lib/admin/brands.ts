import { prisma } from "@/lib/db";

export type BrandRow = {
  id: string;
  slug: string;
  name: string;
  productCount: number;
};

/**
 * The Fragrantica dataset has 1,748 brands, while only a few currently have
 * store products. Without `q`, this limits the list to relevant brands. With
 * `q`, it searches the whole reference set so a brand can be corrected before
 * its first product is added.
 */
export async function listBrands(q: string): Promise<BrandRow[]> {
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
      _count: { select: { products: true } },
    },
  });

  return brands.map((brand) => ({
    id: brand.id,
    slug: brand.slug,
    name: brand.name,
    productCount: brand._count.products,
  }));
}
