import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { listProducts } from "@/lib/admin/products";
import { loadProductListParams } from "@/lib/admin/product-list-params";
import { AdminSearch } from "@/components/admin/admin-search";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { ProductCards } from "./_components/product-cards";
import { ProductsTable } from "./_components/products-table";
import { NEW_ADMIN_PRODUCT_PATH } from "./paths";

export const metadata: Metadata = { title: "Productos" };

/** `estado` tabs, in display order; ids match `PRODUCT_ESTADO_VALUES`. */
const STATUS_FILTER_OPTIONS = [
  { id: "todos", label: "Todos" },
  { id: "publicados", label: "Publicados" },
  { id: "borradores", label: "Borradores" },
];

function NewProductButton() {
  return (
    <Button asChild>
      <Link href={NEW_ADMIN_PRODUCT_PATH}>
        <Plus />
        Nuevo producto
      </Link>
    </Button>
  );
}

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
          <NewProductButton />
        }
      />

      <div className="p-8 pt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <FilterTabs
            options={STATUS_FILTER_OPTIONS}
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
          <EmptyState
            message={
              hasActiveFilters
                ? "No hay productos que coincidan con la búsqueda."
                : "Todavía no cargaste ningún producto."
            }
          >
            <NewProductButton />
          </EmptyState>
        ) : (
          <>
            <div className="hidden md:block">
              <ProductsTable rows={rows} />
            </div>
            <div className="flex flex-col gap-3 md:hidden">
              <p className="text-xs text-muted-foreground">
                Tocá un precio para cambiarlo.
              </p>
              <ProductCards rows={rows} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
