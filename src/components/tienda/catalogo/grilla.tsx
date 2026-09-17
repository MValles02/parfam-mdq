import { cache } from "react";
import { TarjetaProductoCard } from "@/components/tienda/tarjeta-producto";
import { listarCatalogo } from "@/lib/tienda/consultas";
import {
  contarFiltrosActivos,
  type FiltrosCatalogo,
} from "@/lib/tienda/filtros";

/**
 * `listarCatalogo` envuelta en `cache()` de React: el conteo del encabezado
 * (`FraseTotal`), la grilla y el paginado la llaman con el mismo objeto
 * `filtros` durante el mismo render de servidor, y `cache()` dedupea esas
 * llamadas en una sola consulta a la base.
 */
export const listarCatalogoCacheado = cache(listarCatalogo);

/**
 * La grilla en si (design/Main.dc.html y HomeMobile.dc.html, bloque
 * "Grilla"). Es quien llama a `listarCatalogo`, adentro del `Suspense` que
 * arma `seccion-catalogo.tsx`, para que el streaming muestre el skeleton
 * mientras la consulta esta en vuelo.
 */
export async function Grilla({
  filtros,
  marcaFija,
  nivelTarjeta = "h2",
}: {
  filtros: FiltrosCatalogo;
  marcaFija?: string;
  nivelTarjeta?: "h2" | "h3";
}) {
  const { tarjetas } = await listarCatalogoCacheado(filtros);

  if (tarjetas.length === 0) {
    // La marca fija de /marca/[slug] no es un filtro que el usuario haya
    // elegido, asi que no cuenta para decidir cual de los dos mensajes va.
    const hayFiltros =
      contarFiltrosActivos(marcaFija ? { ...filtros, marca: null } : filtros) >
      0;

    return (
      <div className="rounded border border-dashed border-border p-16 text-center text-muted-foreground">
        {hayFiltros
          ? "No hay fragancias con esos filtros. Probá limpiando alguno."
          : "Todavía no hay fragancias publicadas."}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4 lg:gap-7">
      {tarjetas.map((producto, i) => (
        <TarjetaProductoCard
          key={producto.slug}
          producto={producto}
          prioridad={i < 4}
          nivel={nivelTarjeta}
        />
      ))}
    </div>
  );
}

/**
 * Frase con el total de resultados, formateada por quien la usa: el
 * subtitulo "{n} fragancias disponibles" del encabezado y el "Ver N
 * fragancias" del boton del drawer mobile comparten esta misma consulta
 * cacheada pero necesitan textos distintos.
 */
export async function FraseTotal({
  filtros,
  formato,
}: {
  filtros: FiltrosCatalogo;
  formato: (total: number) => string;
}) {
  const { total } = await listarCatalogoCacheado(filtros);
  return formato(total);
}
