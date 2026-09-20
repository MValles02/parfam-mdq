import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { listarProductos, type FiltroEstado } from "@/lib/admin/productos";
import { BuscadorAdmin } from "@/components/admin/buscador-admin";
import { TabsFiltro } from "@/components/admin/tabs-filtro";
import { TablaProductos } from "./_components/tabla-productos";

export const metadata: Metadata = { title: "Productos" };

const ESTADOS_VALIDOS: FiltroEstado[] = ["todos", "publicados", "borradores"];

function esFiltroEstado(valor: string | undefined): valor is FiltroEstado {
  return ESTADOS_VALIDOS.includes(valor as FiltroEstado);
}

export default async function Page(props: PageProps<"/admin/productos">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const estadoParam = typeof sp.estado === "string" ? sp.estado : undefined;
  const estado = esFiltroEstado(estadoParam) ? estadoParam : "todos";

  const { filas, publicados, borradores, total } = await listarProductos({
    q,
    estado,
  });

  const hayFiltrosActivos = q.trim() !== "" || estado !== "todos";

  return (
    <>
      <PageHeader
        title="Productos"
        description={`${publicados} publicados · ${borradores} en borrador`}
        action={
          <div className="flex items-center gap-2.5">
            <BuscadorAdmin placeholder="Buscar producto o marca" />
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
          <TabsFiltro
            opciones={[
              { id: "todos", label: "Todos" },
              { id: "publicados", label: "Publicados" },
              { id: "borradores", label: "Borradores" },
            ]}
            valorDefecto="todos"
          />
          <span className="ml-auto text-sm text-muted-foreground">
            {filas.length} de {total}
          </span>
        </div>

        {filas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded border border-dashed p-16 text-center">
            <p className="text-sm text-muted-foreground">
              {hayFiltrosActivos
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
          <TablaProductos filas={filas} />
        )}
      </div>
    </>
  );
}
