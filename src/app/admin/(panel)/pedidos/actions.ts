"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/admin/guard";
import { actionFailure, type ActionResult } from "@/lib/admin/action-result";
import { prisma } from "@/lib/db";

/**
 * Every action in this file starts with `requireAdmin()`. A Server Action is a
 * public POST endpoint, so the `/admin` layout does not protect it.
 */

function revalidateOrder(id: string) {
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${id}`);
}

export async function changeOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<ActionResult> {
  await requireAdmin();

  const orderExists = await prisma.order.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!orderExists) return actionFailure("Ese pedido ya no existe.");

  await prisma.order.update({
    where: { id },
    data: { status },
  });
  revalidateOrder(id);
  return { ok: true };
}

export async function saveOrderNotes(
  id: string,
  notes: string,
): Promise<ActionResult> {
  await requireAdmin();

  const orderExists = await prisma.order.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!orderExists) return actionFailure("Ese pedido ya no existe.");

  await prisma.order.update({
    where: { id },
    data: { adminNotes: notes.trim() || null },
  });
  revalidateOrder(id);
  return { ok: true };
}
