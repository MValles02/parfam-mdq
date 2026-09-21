import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { listProducts, type ProductStatusFilter } from "@/lib/admin/products";
import { AdminSearch } from "@/components/admin/admin-search";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { ProductsTable } from "./_components/products-table";

export const metadata: Metadata = { title: "Productos" };

const VALID_STATUS_FILTERS: ProductStatusFilter[] = [
  "todos",
  "publicados",
  "borradores",
];

function isProductStatusFilter(
  value: string | undefined,
): value is ProductStatusFilter {
  return VALID_STATUS_FILTERS.includes(value as ProductStatusFilter);
}

export default async function Page(props: PageProps<"/admin/productos">) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q : "";
  const statusParameter =
    typeof searchParams.estado === "string" ? searchParams.estado : undefined;
  const status = isProductStatusFilter(statusParameter)
    ? statusParameter
    : "todos";

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
          <div className="flex items-center gap-2.5">
            <AdminSearch placeholder="Buscar producto o marca" />
            <Button asChild>
              <Link href="/admin/productos/nuevo">
                <Plus />
                Nuevo producto
              </Link>
            </Button>
          </div>
        }
      />

      <div className="p-8 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <FilterTabs
            options={[
              { id: "todos", label: "Todos" },
              { id: "publicados", label: "Publicados" },
              { id: "borradores", label: "Borradores" },
            ]}
            defaultValue="todos"
          />
          <span className="ml-auto text-sm text-muted-foreground">
            {rows.length} de {total}
          </span>
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
