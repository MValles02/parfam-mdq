import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { listarPedidos, type FiltroEstadoPedido } from "@/lib/admin/pedidos";
import { BuscadorPedidos } from "./_components/buscador-pedidos";
import { TabsEstadoPedido } from "./_components/tabs-estado-pedido";
import { TablaPedidos } from "./_components/tabla-pedidos";

export const metadata: Metadata = { title: "Pedidos" };

const ESTADOS_VALIDOS: FiltroEstadoPedido[] = [
  "todos",
  "pendientes",
  "confirmados",
  "entregados",
  "cancelados",
];

function esFiltroEstado(
  valor: string | undefined,
): valor is FiltroEstadoPedido {
  return ESTADOS_VALIDOS.includes(valor as FiltroEstadoPedido);
}

export default async function Page(props: PageProps<"/admin/pedidos">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const estadoParam = typeof sp.estado === "string" ? sp.estado : undefined;
  const estado = esFiltroEstado(estadoParam) ? estadoParam : "todos";

  const { filas, pendientes, confirmados, entregados, total } =
    await listarPedidos({ q, estado });

  const hayFiltrosActivos = q.trim() !== "" || estado !== "todos";

  return (
    <>
      <PageHeader
        title="Pedidos"
        description={`${pendientes} pendientes · ${confirmados} confirmados · ${entregados} entregados`}
        action={<BuscadorPedidos />}
      />

      <div className="p-8 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <TabsEstadoPedido />
          <span className="ml-auto text-sm text-muted-foreground">
            {filas.length} de {total}
          </span>
        </div>

        {filas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded border border-dashed p-16 text-center">
            <p className="text-sm text-muted-foreground">
              {hayFiltrosActivos
                ? "No hay pedidos que coincidan con la búsqueda."
                : "Todavía no entró ningún pedido."}
            </p>
          </div>
        ) : (
          <TablaPedidos filas={filas} />
        )}
      </div>
    </>
  );
}
