import { prisma } from "@/lib/db";

/** Los cuatro números que muestra el home del panel (`/admin`). */
export async function obtenerEstadisticasPanel() {
  const [
    publicados,
    borradores,
    pedidosPendientes,
    notasSinTraducir,
    referencias,
  ] = await Promise.all([
    prisma.product.count({ where: { status: "PUBLISHED" } }),
    prisma.product.count({ where: { status: "DRAFT" } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.note.count({ where: { nameEs: null } }),
    prisma.fragranceRef.count(),
  ]);

  return {
    publicados,
    borradores,
    pedidosPendientes,
    notasSinTraducir,
    referencias,
  };
}
