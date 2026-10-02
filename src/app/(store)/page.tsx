import type { Metadata } from "next";
import { PresentationsStrip } from "@/components/store/presentations-strip";
import { Hero } from "@/components/store/hero";
import { CatalogSection } from "@/components/store/catalog/catalog-section";
import { getFilterOptions } from "@/lib/store/queries";
import { loadCatalogFilters } from "@/lib/store/filters";
import { buildPageMetadata } from "@/lib/seo";
import { siteDefaults } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: `${siteDefaults.name} — Perfumería`,
  description: siteDefaults.description,
  path: "/",
});

/** Home page with the hero and catalog. */
export default async function Page(props: PageProps<"/">) {
  const [filters, filterOptions] = await Promise.all([
    loadCatalogFilters(props.searchParams),
    getFilterOptions(),
  ]);

  return (
    <>
      <Hero />
      <PresentationsStrip className="mx-auto hidden max-w-page px-5 pt-10 lg:block lg:px-16" />
      {/* The hero logo is the page h1, so the catalog heading starts below it. */}
      <CatalogSection
        title="Catálogo"
        headingLevel="h2"
        filters={filters}
        filterOptions={filterOptions}
        mobileInsert={
          <PresentationsStrip className="col-span-full lg:hidden" />
        }
      />
    </>
  );
}
