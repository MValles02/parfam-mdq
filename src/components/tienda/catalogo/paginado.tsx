import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { FiltrosCatalogo } from "@/lib/tienda/filtros";
import { listarCatalogoCacheado } from "./grilla";

/**
 * Arma el querystring de una pagina a partir de los filtros actuales,
 * cambiando solo `pagina`. La pagina 1 no lleva `?pagina=1`. Cuando la marca
 * viene fija por la ruta (`/marca/[slug]`) no se repite como parametro: ya
 * esta implicita en el path.
 */
function hrefPagina(
  filtros: FiltrosCatalogo,
  pagina: number,
  marcaFija?: string,
): string {
  const params = new URLSearchParams();
  if (filtros.q.trim()) params.set("q", filtros.q.trim());
  if (filtros.genero) params.set("genero", filtros.genero);
  if (filtros.presentacion) params.set("presentacion", filtros.presentacion);
  if (filtros.marca && !marcaFija) params.set("marca", filtros.marca);
  if (filtros.acorde) params.set("acorde", filtros.acorde);
  if (filtros.nota) params.set("nota", filtros.nota);
  if (filtros.precio) params.set("precio", filtros.precio);
  if (filtros.orden !== "novedades") params.set("orden", filtros.orden);
  if (pagina > 1) params.set("pagina", String(pagina));

  const qs = params.toString();
  return qs ? `?${qs}` : "?";
}

/** Que paginas mostrar, con "..." donde el rango se corta. */
function paginasAMostrar(actual: number, total: number): (number | "...")[] {
  const desde = Math.max(2, actual - 1);
  const hasta = Math.min(total - 1, actual + 1);

  const resultado: (number | "...")[] = [1];
  if (desde > 2) resultado.push("...");
  for (let p = desde; p <= hasta; p++) resultado.push(p);
  if (hasta < total - 1) resultado.push("...");
  if (total > 1) resultado.push(total);
  return resultado;
}

/**
 * Paginado del catalogo (Server Component). Links `<a href>` reales, no
 * botones de cliente, armados con la misma consulta cacheada que usa
 * `Grilla` (ver `grilla.tsx`).
 */
export async function Paginado({
  filtros,
  marcaFija,
}: {
  filtros: FiltrosCatalogo;
  marcaFija?: string;
}) {
  const { pagina, paginas } = await listarCatalogoCacheado(filtros);
  if (paginas <= 1) return null;

  const href = (p: number) => hrefPagina(filtros, p, marcaFija);
  const enPrimera = pagina <= 1;
  const enUltima = pagina >= paginas;

  return (
    <Pagination className="mt-10">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            text="Anterior"
            href={href(Math.max(1, pagina - 1))}
            aria-disabled={enPrimera}
            tabIndex={enPrimera ? -1 : undefined}
            className={enPrimera ? "pointer-events-none opacity-50" : undefined}
          />
        </PaginationItem>

        {paginasAMostrar(pagina, paginas).map((p, i) =>
          p === "..." ? (
            <PaginationItem key={`elipsis-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink href={href(p)} isActive={p === pagina}>
                {p}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            text="Siguiente"
            href={href(Math.min(paginas, pagina + 1))}
            aria-disabled={enUltima}
            tabIndex={enUltima ? -1 : undefined}
            className={enUltima ? "pointer-events-none opacity-50" : undefined}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
