import { Suspense } from "react";
import type { OpcionesDeFiltro } from "@/lib/tienda/consultas";
import type { FiltrosCatalogo } from "@/lib/tienda/filtros";
import { DrawerFiltros } from "./drawer-filtros";
import { FraseTotal, Grilla } from "./grilla";
import { GrillaSkeleton } from "./grilla-skeleton";
import { Paginado } from "./paginado";
import { PanelFiltros } from "./panel-filtros";
import { SelectOrden } from "./select-orden";

const FALLBACK_TOTAL = (
  <span className="inline-block h-[1em] w-40 animate-pulse rounded-sm bg-muted align-middle" />
);

/**
 * Cuerpo del catalogo, compartido por la home, `/catalogo` y
 * `/marca/[slug]` (design/Main.dc.html y design/HomeMobile.dc.html, bloque
 * "Catálogo").
 *
 * `opcionesDeFiltro()` se pide una vez, en la pagina (Server Component), y
 * baja por props via `opciones`. `listarCatalogo()` en cambio se llama
 * adentro de los componentes async que van dentro de cada `Suspense`
 * (`grilla.tsx`), para que el streaming muestre los esqueletos mientras la
 * consulta esta en vuelo. El total del encabezado y el "Ver N fragancias"
 * del drawer mobile usan la misma consulta cacheada, cada uno en su propio
 * `Suspense` chico: si compartieran el de la grilla, cada cambio de filtro
 * haria parpadear tambien el panel de filtros, que tiene que quedar visible
 * todo el tiempo.
 */
export function SeccionCatalogo({
  filtros,
  titulo,
  opciones,
  marcaFija,
  nivelTitulo: Titulo = "h1",
}: {
  filtros: FiltrosCatalogo;
  titulo: string;
  opciones: OpcionesDeFiltro;
  marcaFija?: string;
  /**
   * "h2" en la home, donde el <h1> es el logotipo del hero. En /catalogo y
   * /marca/[slug] esta seccion ES la pagina, asi que su titulo es el <h1>.
   * De este nivel cuelga el de los nombres de las tarjetas.
   */
  nivelTitulo?: "h1" | "h2";
}) {
  const claveGrilla = JSON.stringify(filtros);

  return (
    <section
      id="catalogo"
      className="mx-auto max-w-[1440px] px-5 pt-10 pb-16 lg:px-16 lg:pb-24"
    >
      <div className="mb-8 flex flex-col gap-4 border-t border-border pt-8 lg:mb-10 lg:flex-row lg:items-end lg:justify-between lg:pt-10">
        <div className="flex flex-col gap-1.5">
          <Titulo className="text-[32px] leading-none font-extrabold tracking-[-0.03em] lg:text-[44px]">
            {titulo}
          </Titulo>
          <p className="text-[13px] text-muted-foreground lg:text-sm">
            <Suspense fallback={FALLBACK_TOTAL}>
              <FraseTotal
                filtros={filtros}
                formato={(n) =>
                  `${n} fragancia${n === 1 ? "" : "s"} disponible${n === 1 ? "" : "s"}`
                }
              />
            </Suspense>
          </p>
        </div>

        <div className="hidden items-center gap-2.5 lg:flex">
          <span className="text-xs font-bold tracking-[0.12em] text-muted-foreground">
            ORDENAR
          </span>
          <SelectOrden className="min-w-[190px] rounded border-border bg-card py-2.5" />
        </div>
      </div>

      <div className="mb-10 hidden lg:block">
        <PanelFiltros opciones={opciones} marcaFija={marcaFija} />
      </div>

      <div className="mb-5 flex items-center gap-2.5 lg:hidden">
        <DrawerFiltros
          opciones={opciones}
          marcaFija={marcaFija}
          textoAplicar={
            <Suspense fallback="Ver fragancias">
              <FraseTotal
                filtros={filtros}
                formato={(n) => `Ver ${n} fragancia${n === 1 ? "" : "s"}`}
              />
            </Suspense>
          }
        />
        <SelectOrden className="h-12 rounded border-border bg-card px-4" />
      </div>

      <Suspense key={claveGrilla} fallback={<GrillaSkeleton />}>
        <Grilla
          filtros={filtros}
          marcaFija={marcaFija}
          nivelTarjeta={Titulo === "h1" ? "h2" : "h3"}
        />
        <Paginado filtros={filtros} marcaFija={marcaFija} />
      </Suspense>
    </section>
  );
}
