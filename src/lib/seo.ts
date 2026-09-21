import type { Metadata } from "next";
import { env } from "@/lib/env";
import { siteDefaults } from "@/lib/site";
import { GENDER_LABELS, VARIANT_KIND_LABELS } from "@/lib/catalog";
import type { PublicProduct } from "@/lib/store/queries";

/**
 * Shared SEO helpers for store pages.
 *
 * The site URL comes from NEXT_PUBLIC_SITE_URL (validated in src/lib/env.ts),
 * not siteDefaults: local development uses http://localhost:3000 and canonical
 * URLs must point to the running environment instead of always production.
 */

export const SITE_URL = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Metadata with canonical and Open Graph values shared by each page.
 *
 * It intentionally does not set `openGraph.images`: `opengraph-image.tsx`
 * files provide it through Next's convention. An explicit page image would
 * override the generated one, which contains the brand at 1200x630; product
 * photos are vertical and social networks crop them poorly.
 */
export function buildPageMetadata(options: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = absoluteUrl(options.path);
  return {
    title: options.title,
    description: options.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: siteDefaults.name,
      locale: "es_AR",
      title: options.title,
      description: options.description,
    },
    twitter: { card: "summary_large_image" },
  };
}

/**
 * Serializes JSON-LD for a <script>. Escaping `<` prevents administrator text
 * containing HTML from closing the script and becoming XSS (see
 * node_modules/next/dist/docs/01-app/02-guides/json-ld.md).
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Product and AggregateOffer data only includes active, purchasable variants.
 */
export function productJsonLd(product: PublicProduct, imageUrls: string[]) {
  const prices = product.variants.map((variant) => Number(variant.price));
  const url = absoluteUrl(`/producto/${product.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url,
    ...(product.description ? { description: product.description } : {}),
    ...(imageUrls.length > 0 ? { image: imageUrls } : {}),
    brand: { "@type": "Brand", name: product.brandName },
    ...(product.gender
      ? {
          audience: {
            "@type": "PeopleAudience",
            suggestedGender: GENDER_LABELS[product.gender],
          },
        }
      : {}),
    ...(product.perfumers.length > 0
      ? {
          manufacturer: { "@type": "Organization", name: product.brandName },
        }
      : {}),
    ...(prices.length > 0
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "ARS",
            lowPrice: Math.min(...prices),
            highPrice: Math.max(...prices),
            offerCount: prices.length,
            offers: product.variants.map((variant) => ({
              "@type": "Offer",
              name: `${product.name} — ${VARIANT_KIND_LABELS[variant.kind]}${variant.sizeMl ? ` ${variant.sizeMl} ml` : ""}`,
              price: variant.price,
              priceCurrency: "ARS",
              availability: "https://schema.org/InStock",
              itemCondition: "https://schema.org/NewCondition",
              url,
              seller: { "@type": "Organization", name: siteDefaults.legalName },
            })),
          },
        }
      : {}),
  };
}

/** Breadcrumbs for Google, which displays them above the search result. */
export function buildBreadcrumbJsonLd(
  breadcrumbs: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((breadcrumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: breadcrumb.name,
      item: absoluteUrl(breadcrumb.path),
    })),
  };
}
