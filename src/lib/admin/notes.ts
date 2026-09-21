import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type NoteTranslationStatus = "pending" | "translated";

const PAGE_SIZE = 50;

/**
 * Rows for `/admin/notas`, including the filter-tab counts.
 *
 * The `Note_untranslated_idx` partial index exactly covers the pending query
 * (`usageCount desc WHERE nameEs IS NULL`), so it must keep `nameEs: null`.
 */
export async function listNotes(options: {
  q?: string;
  status?: NoteTranslationStatus;
  page?: number;
}) {
  const q = (options.q ?? "").trim();
  const status = options.status ?? "pending";
  const page = options.page && options.page > 1 ? options.page : 1;

  const where: Prisma.NoteWhereInput = {
    nameEs: status === "pending" ? null : { not: null },
    ...(q
      ? {
          OR: [
            { nameEn: { contains: q, mode: "insensitive" } },
            { nameEs: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [notes, total, pending, translated] = await Promise.all([
    prisma.note.findMany({
      where,
      orderBy: { usageCount: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, nameEn: true, nameEs: true, usageCount: true },
    }),
    prisma.note.count({ where }),
    prisma.note.count({ where: { nameEs: null } }),
    prisma.note.count({ where: { nameEs: { not: null } } }),
  ]);

  return {
    notes,
    total,
    pending,
    translated,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
