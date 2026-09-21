import Link from "next/link";
import type { Metadata } from "next";
import { AdminSearch } from "@/components/admin/admin-search";
import { PageHeader } from "@/components/admin/page-header";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { Button } from "@/components/ui/button";
import { listNotes } from "@/lib/admin/notes";
import { NoteRow } from "./_components/note-row";

export const metadata: Metadata = { title: "Notas sin traducir" };

const numberFormatter = new Intl.NumberFormat("es-AR");

function readString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function Page(props: PageProps<"/admin/notas">) {
  const searchParams = await props.searchParams;

  const q = readString(searchParams.q).trim();
  // `estado` and `pagina` are established URL boundary keys and values.
  const status =
    readString(searchParams.estado) === "traducidas" ? "translated" : "pending";
  const requestedPage = Number(readString(searchParams.pagina));
  const page =
    Number.isFinite(requestedPage) && requestedPage > 1
      ? Math.floor(requestedPage)
      : 1;

  const { notes, total, pending, translated, totalPages } = await listNotes({
    q,
    status,
    page,
  });

  const totalNotes = pending + translated;

  function getPageHref(destination: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "pending") params.set("estado", "traducidas");
    if (destination > 1) params.set("pagina", String(destination));
    const queryString = params.toString();
    return queryString ? `/admin/notas?${queryString}` : "/admin/notas";
  }

  return (
    <>
      <PageHeader
        title="Notas sin traducir"
        description={`Faltan ${numberFormatter.format(pending)} de ${numberFormatter.format(totalNotes)}. Se traducen primero las que más aparecen.`}
      />

      <div className="flex flex-col gap-4 p-8">
        <div className="flex items-center justify-between gap-4">
          <FilterTabs<"pendientes" | "traducidas">
            options={[
              { id: "pendientes", label: "Pendientes" },
              { id: "traducidas", label: "Traducidas" },
            ]}
            defaultValue="pendientes"
            counts={{ pendientes: pending, traducidas: translated }}
            resetPage
          />
          <AdminSearch
            placeholder="Buscar nota en inglés o español"
            resetPage
          />
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

          {notes.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              {q
                ? "No hay notas que coincidan con la búsqueda."
                : status === "pending"
                  ? "No quedan notas sin traducir. 🎉"
                  : "Todavía no se tradujo ninguna nota."}
            </div>
          ) : (
            notes.map((note) => (
              <NoteRow
                key={note.id}
                id={note.id}
                nameEn={note.nameEn}
                nameEs={note.nameEs}
                usageCount={note.usageCount}
              />
            ))
          )}
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {numberFormatter.format(total)} notas · página {page} de{" "}
              {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                asChild={page > 1}
              >
                {page > 1 ? (
                  <Link href={getPageHref(page - 1)}>Anterior</Link>
                ) : (
                  <span>Anterior</span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                asChild={page < totalPages}
              >
                {page < totalPages ? (
                  <Link href={getPageHref(page + 1)}>Siguiente</Link>
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
