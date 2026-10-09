import { prisma } from "@/lib/db";
import { PUBLIC_PRODUCT_WHERE } from "@/lib/store/visibility";

/**
 * Store actions invalidate this tag after changing product URLs. Its value is
 * an existing cache contract and must stay stable.
 */
export const TAG_SITEMAP_URLS = "sitemap-urls";

/** Returns sitemap entries with their last-modified dates. */
export async function getSitemapUrls() {
  const products = await prisma.product.findMany({
    where: PUBLIC_PRODUCT_WHERE,
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  return { products };
}
