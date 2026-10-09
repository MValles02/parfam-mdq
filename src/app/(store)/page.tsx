import type { Metadata } from "next";
import { CatalogShortcuts } from "@/components/store/home/catalog-shortcuts";
import { HowItWorks } from "@/components/store/home/how-it-works";
import { PresentationChoices } from "@/components/store/home/presentation-choices";
import { Hero } from "@/components/store/hero";
import { CatalogSection } from "@/components/store/catalog/catalog-section";
import { getFilterOptions } from "@/lib/store/queries";
import { isCatalogView, loadCatalogFilters } from "@/lib/store/filters";
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

  if (isCatalogView(filters)) {
    return (
      <CatalogSection
        title="Fragancias"
        headingLevel="h1"
        filters={filters}
        filterOptions={filterOptions}
      />
    );
  }

  return (
    <>
      <Hero />
      <CatalogShortcuts />
      <PresentationChoices />
      <HowItWorks />
      {/* The hero logo is the page h1, so the catalog heading starts below it. */}
      <CatalogSection
        title="Catálogo"
        headingLevel="h2"
        filters={filters}
        filterOptions={filterOptions}
      />
    </>
  );
}
