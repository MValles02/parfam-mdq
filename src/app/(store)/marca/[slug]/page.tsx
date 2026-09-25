import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogSection } from "@/components/store/catalog/catalog-section";
import { getBrandBySlug, getFilterOptions } from "@/lib/store/queries";
import { loadCatalogFilters } from "@/lib/store/filters";
import { buildPageMetadata } from "@/lib/seo";

/**
 * A brand catalog (`/marca/[slug]`) has a route-owned brand filter. The
 * `marca` query key is ignored and its control is not displayed.
 */
export async function generateMetadata(
  props: PageProps<"/marca/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return {};

  return buildPageMetadata({
    title: brand.name,
    description: `Fragancias de ${brand.name}${brand.country ? ` (${brand.country})` : ""} en ParfamMdq: frascos, testers y decants.`,
    path: `/marca/${slug}`,
  });
}

export default async function Page(props: PageProps<"/marca/[slug]">) {
  const { slug } = await props.params;
  const [brand, filterOptions, urlFilters] = await Promise.all([
    getBrandBySlug(slug),
    getFilterOptions(),
    loadCatalogFilters(props.searchParams),
  ]);
  if (!brand) notFound();

  const filters = { ...urlFilters, brand: slug };

  // CatalogSection renders the brand name as the page heading, so this route
  // does not duplicate it in another h1.
  return (
    <>
      <div className="mx-auto max-w-page px-5 lg:px-16">
        <p className="pt-5 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Inicio
          </Link>
          {" · "}
          <Link href="/catalogo" className="hover:text-foreground">
            Catálogo
          </Link>
          {` · ${brand.name}`}
        </p>
        {brand.country ? (
          <p className="mt-1 text-sm text-muted-foreground">{brand.country}</p>
        ) : null}
      </div>

      <CatalogSection
        title={brand.name}
        filters={filters}
        filterOptions={filterOptions}
        fixedBrand={slug}
      />
    </>
  );
}
