import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { listarMarcas } from "@/lib/admin/marcas";
import { BuscadorMarcas } from "./_components/buscador-marcas";
import { TablaMarcas } from "./_components/tabla-marcas";

export const metadata: Metadata = { title: "Marcas" };

export default async function Page(props: PageProps<"/admin/marcas">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";

  const marcas = await listarMarcas(q);

  return (
    <>
      <PageHeader
        title="Marcas"
        description="El dataset trae la marca en formato slug (lancome, jean-paul-gaultier): corregí acá el nombre que se muestra en la tienda."
        action={<BuscadorMarcas />}
      />

      <div className="p-8 pt-6">
        {marcas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded border border-dashed p-16 text-center">
            <p className="text-sm text-muted-foreground">
              {q.trim()
                ? "No hay marcas que coincidan con la búsqueda."
                : "Todavía no hay productos con marca asignada."}
            </p>
          </div>
        ) : (
          <TablaMarcas filas={marcas} />
        )}
      </div>
    </>
  );
}
