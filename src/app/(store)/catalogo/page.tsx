import type { Metadata } from "next";
import Link from "next/link";
import { CatalogSection } from "@/components/store/catalog/catalog-section";
import { getFilterOptions } from "@/lib/store/queries";
import { loadCatalogFilters } from "@/lib/store/filters";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Catálogo",
  description:
    "Todos los perfumes, frascos, testers y decants de ParfamMdq: filtrá por género, presentación, marca, familia olfativa o precio.",
  path: "/catalogo",
});

export default async function Page(props: PageProps<"/catalogo">) {
  const [filters, filterOptions] = await Promise.all([
    loadCatalogFilters(props.searchParams),
    getFilterOptions(),
  ]);

  return (
    <>
      <div className="mx-auto max-w-page px-5 lg:px-16">
        <p className="pt-5 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Inicio
          </Link>
          {" · Catálogo"}
        </p>
      </div>
      <CatalogSection
        title="Catálogo"
        filters={filters}
        filterOptions={filterOptions}
      />
    </>
  );
}
