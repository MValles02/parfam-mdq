import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { listProducts } from "@/lib/admin/products";
import { loadProductListParams } from "@/lib/admin/product-list-params";
import { AdminSearch } from "@/components/admin/admin-search";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { ProductsTable } from "./_components/products-table";

export const metadata: Metadata = { title: "Productos" };

export default async function Page(props: PageProps<"/admin/productos">) {
  const { q: query, estado: status } = await loadProductListParams(
    props.searchParams,
  );

  const { rows, published, drafts, total } = await listProducts({
    query,
    status,
  });

  const hasActiveFilters = query.trim() !== "" || status !== "todos";

  return (
    <>
      <PageHeader
        title="Productos"
        description={`${published} publicados · ${drafts} en borrador`}
        action={
          <Button asChild>
            <Link href="/admin/productos/nuevo">
              <Plus />
              Nuevo producto
            </Link>
          </Button>
        }
      />

      <div className="p-8 pt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <FilterTabs
            options={[
              { id: "todos", label: "Todos" },
              { id: "publicados", label: "Publicados" },
              { id: "borradores", label: "Borradores" },
            ]}
            defaultValue="todos"
            counts={{ todos: total, publicados: published, borradores: drafts }}
          />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {rows.length} de {total}
            </span>
            <AdminSearch placeholder="Buscar producto o marca" />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded border border-dashed p-16 text-center">
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? "No hay productos que coincidan con la búsqueda."
                : "Todavía no cargaste ningún producto."}
            </p>
            <Button asChild>
              <Link href="/admin/productos/nuevo">
                <Plus />
                Nuevo producto
              </Link>
            </Button>
          </div>
        ) : (
          <ProductsTable rows={rows} />
        )}
      </div>
    </>
  );
}
