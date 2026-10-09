import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { countUncorrectedBrands, listBrands } from "@/lib/admin/brands";
import { loadBrandListParams } from "@/lib/admin/brand-list-params";
import { AdminSearch } from "@/components/admin/admin-search";
import { EmptyState } from "@/components/admin/empty-state";
import { BrandsTable } from "./_components/brands-table";

export const metadata: Metadata = { title: "Marcas" };

export default async function BrandsPage(props: PageProps<"/admin/marcas">) {
  // `filtro` is the user-facing Spanish querystring name; `listBrands` calls
  // the same option `filter`.
  const { q, filtro } = await loadBrandListParams(props.searchParams);

  const [brands, uncorrected] = await Promise.all([
    listBrands(q, filtro),
    countUncorrectedBrands(),
  ]);

  return (
    <>
      <PageHeader
        title="Marcas"
        description="El dataset trae la marca en formato slug (lancome, jean-paul-gaultier): corregí acá el nombre que se muestra en la tienda."
        action={<AdminSearch placeholder="Buscar marca o slug" />}
      />

      <div className="flex flex-col gap-4 p-8 pt-6">
        {uncorrected > 0 || filtro === "sin-corregir" ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-warning-foreground/30 bg-warning px-4 py-3 text-sm text-warning-foreground">
            <span>
              {uncorrected}{" "}
              {uncorrected === 1 ? "marca muestra" : "marcas muestran"} el slug
              en lugar del nombre.
            </span>
            <Link
              href={
                filtro === "sin-corregir"
                  ? "/admin/marcas"
                  : "/admin/marcas?filtro=sin-corregir"
              }
              className="font-semibold underline"
            >
              {filtro === "sin-corregir" ? "Ver todas" : "Ver solo esas"}
            </Link>
          </div>
        ) : null}

        {brands.length === 0 ? (
          <EmptyState
            message={
              q.trim() || filtro === "sin-corregir"
                ? "No hay marcas que coincidan con la búsqueda."
                : "Todavía no hay productos con marca asignada."
            }
          />
        ) : (
          <BrandsTable rows={brands} />
        )}
      </div>
    </>
  );
}
