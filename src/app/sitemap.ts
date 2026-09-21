import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { absoluteUrl } from "@/lib/seo";
import { TAG_SITEMAP_URLS, getSitemapUrls } from "@/lib/store/queries";

/**
 * A force-dynamic route avoids accessing Postgres during next build, while
 * unstable_cache retains the one-hour sitemap cache. Store actions invalidate
 * the same cache through TAG_SITEMAP_URLS after product URL changes.
 */
export const dynamic = "force-dynamic";

const cachedSitemapUrls = unstable_cache(getSitemapUrls, ["sitemap-urls"], {
  revalidate: 3600,
  tags: [TAG_SITEMAP_URLS],
});

const STATIC_PAGES: {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/catalogo", priority: 0.9, changeFrequency: "daily" },
  { path: "/que-es-un-tester", priority: 0.7, changeFrequency: "monthly" },
  { path: "/como-comprar", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contacto", priority: 0.5, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, brands } = await cachedSitemapUrls();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: absoluteUrl(page.path),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/producto/${product.slug}`),
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const brandEntries: MetadataRoute.Sitemap = brands.map((brand) => ({
    url: absoluteUrl(`/marca/${brand.slug}`),
    lastModified: brand.updatedAt,
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  return [...staticEntries, ...productEntries, ...brandEntries];
}
