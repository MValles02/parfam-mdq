"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/admin/guard";
import { type Resultado } from "@/lib/admin/resultado";
import { prisma } from "@/lib/db";

/**
 * Toda accion de este archivo arranca con `requireAdmin()`. Una Server Action
 * es un endpoint POST publico: el layout de /admin no la protege.
 */

function fallo(mensaje: string) {
  return { ok: false as const, mensaje };
}

function revalidarPedido(id: string) {
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${id}`);
}

export async function cambiarEstadoPedido(
  id: string,
  estado: OrderStatus,
): Promise<Resultado> {
  await requireAdmin();

  const existe = await prisma.order.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existe) return fallo("Ese pedido ya no existe.");

  await prisma.order.update({
    where: { id },
    data: { status: estado },
  });
  revalidarPedido(id);
  return { ok: true };
}

export async function guardarNotasPedido(
  id: string,
  notas: string,
): Promise<Resultado> {
  await requireAdmin();

  const existe = await prisma.order.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existe) return fallo("Ese pedido ya no existe.");

  await prisma.order.update({
    where: { id },
    data: { adminNotes: notas.trim() || null },
  });
  revalidarPedido(id);
  return { ok: true };
}
