import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { BuscadorNotas } from "./_components/buscador-notas";
import { FilaNota } from "./_components/fila-nota";
import { TabsNotas } from "./_components/tabs-notas";

export const metadata: Metadata = { title: "Notas sin traducir" };

const POR_PAGINA = 50;

const formatoNumero = new Intl.NumberFormat("es-AR");

function leerString(valor: string | string[] | undefined) {
  return typeof valor === "string" ? valor : "";
}

export default async function Page(props: PageProps<"/admin/notas">) {
  const sp = await props.searchParams;

  const q = leerString(sp.q).trim();
  const estado =
    leerString(sp.estado) === "traducidas" ? "traducidas" : "pendientes";
  const paginaSolicitada = Number(leerString(sp.pagina));
  const pagina =
    Number.isFinite(paginaSolicitada) && paginaSolicitada > 1
      ? Math.floor(paginaSolicitada)
      : 1;

  // El indice parcial `Note_untranslated_idx` cubre exactamente esta consulta
  // (usageCount desc WHERE nameEs IS NULL), asi que el filtro tiene que
  // quedar como `nameEs: null` en vez de, por ejemplo, negar `not: { not: null }`.
  const where: Prisma.NoteWhereInput = {
    nameEs: estado === "pendientes" ? null : { not: null },
    ...(q
      ? {
          OR: [
            { nameEn: { contains: q, mode: "insensitive" } },
            { nameEs: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [notas, total, pendientes, traducidas] = await Promise.all([
    prisma.note.findMany({
      where,
      orderBy: { usageCount: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: { id: true, nameEn: true, nameEs: true, usageCount: true },
    }),
    prisma.note.count({ where }),
    prisma.note.count({ where: { nameEs: null } }),
    prisma.note.count({ where: { nameEs: { not: null } } }),
  ]);

  const totalGeneral = pendientes + traducidas;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  function hrefPagina(destino: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (estado !== "pendientes") params.set("estado", estado);
    if (destino > 1) params.set("pagina", String(destino));
    const qs = params.toString();
    return qs ? `/admin/notas?${qs}` : "/admin/notas";
  }

  return (
    <>
      <PageHeader
        title="Notas sin traducir"
        description={`Faltan ${formatoNumero.format(pendientes)} de ${formatoNumero.format(totalGeneral)}. Se traducen primero las que más aparecen.`}
      />

      <div className="flex flex-col gap-4 p-8">
        <div className="flex items-center justify-between gap-4">
          <TabsNotas pendientes={pendientes} traducidas={traducidas} />
          <BuscadorNotas />
        </div>

        <div className="overflow-hidden rounded border border-border bg-card">
          <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 border-b border-border bg-muted/50 px-5 py-2.5">
            <span className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground">
              NOTA EN INGLÉS
            </span>
            <span className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground">
              TRADUCCIÓN
            </span>
            <span />
          </div>

          {notas.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              {q
                ? "No hay notas que coincidan con la búsqueda."
                : estado === "pendientes"
                  ? "No quedan notas sin traducir. 🎉"
                  : "Todavía no se tradujo ninguna nota."}
            </div>
          ) : (
            notas.map((nota) => (
              <FilaNota
                key={nota.id}
                id={nota.id}
                nameEn={nota.nameEn}
                nameEs={nota.nameEs}
                usageCount={nota.usageCount}
              />
            ))
          )}
        </div>

        {totalPaginas > 1 ? (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {formatoNumero.format(total)} notas · página {pagina} de{" "}
              {totalPaginas}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagina <= 1}
                asChild={pagina > 1}
              >
                {pagina > 1 ? (
                  <Link href={hrefPagina(pagina - 1)}>Anterior</Link>
                ) : (
                  <span>Anterior</span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagina >= totalPaginas}
                asChild={pagina < totalPaginas}
              >
                {pagina < totalPaginas ? (
                  <Link href={hrefPagina(pagina + 1)}>Siguiente</Link>
                ) : (
                  <span>Siguiente</span>
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
