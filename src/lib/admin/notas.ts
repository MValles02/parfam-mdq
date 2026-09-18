import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type FiltroEstadoNota = "pendientes" | "traducidas";

const POR_PAGINA = 50;

/**
 * Filas de `/admin/notas`, con los contadores de las pestañas.
 *
 * El índice parcial `Note_untranslated_idx` cubre exactamente la consulta de
 * "pendientes" (`usageCount desc WHERE nameEs IS NULL`), así que el filtro
 * tiene que quedar como `nameEs: null` en vez de, por ejemplo, negar
 * `not: { not: null }`.
 */
export async function listarNotas(opciones: {
  q?: string;
  estado?: FiltroEstadoNota;
  pagina?: number;
}) {
  const q = (opciones.q ?? "").trim();
  const estado = opciones.estado ?? "pendientes";
  const pagina = opciones.pagina && opciones.pagina > 1 ? opciones.pagina : 1;

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

  return {
    notas,
    total,
    pendientes,
    traducidas,
    totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
  };
}
