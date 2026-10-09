import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { getProductPath } from "@/lib/store/links";
import { absoluteUrl } from "@/lib/seo";
import { TAG_SITEMAP_URLS, getSitemapUrls } from "@/lib/store/queries";

/**
 * A force-dynamic route avoids accessing Postgres during next build, while
 * unstable_cache retains the one-hour sitemap cache. Admin product actions
 * invalidate the same cache through TAG_SITEMAP_URLS after product URL
 * changes.
 */
export const dynamic = "force-dynamic";

const SITEMAP_REVALIDATE_SECONDS = 60 * 60;

const cachedSitemapUrls = unstable_cache(getSitemapUrls, [TAG_SITEMAP_URLS], {
  revalidate: SITEMAP_REVALIDATE_SECONDS,
  tags: [TAG_SITEMAP_URLS],
});

const STATIC_PAGES: {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/presentaciones", priority: 0.7, changeFrequency: "monthly" },
  { path: "/concentraciones", priority: 0.6, changeFrequency: "monthly" },
  { path: "/como-comprar", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contacto", priority: 0.5, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products } = await cachedSitemapUrls();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: absoluteUrl(page.path),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(getProductPath(product.slug)),
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...productEntries];
}
