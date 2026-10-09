"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/admin/guard";
import { actionFailure, type ActionResult } from "@/lib/admin/action-result";
import { prisma } from "@/lib/db";

/**
 * Every action in this file starts with `requireAdmin()`. A Server Action is a
 * public POST endpoint, so the `/admin` layout does not protect it.
 */

const ORDER_NOT_FOUND_MESSAGE = "Ese pedido ya no existe.";

/**
 * Updates an order that may have been deleted since the page rendered, and
 * revalidates the list and detail routes. Callers authorize first.
 */
async function updateExistingOrder(
  id: string,
  data: Prisma.OrderUpdateInput,
): Promise<ActionResult> {
  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!order) return actionFailure(ORDER_NOT_FOUND_MESSAGE);

  await prisma.order.update({ where: { id }, data });
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${id}`);
  return { ok: true };
}

export async function changeOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<ActionResult> {
  await requireAdmin();
  return updateExistingOrder(id, { status });
}

export async function saveOrderNotes(
  id: string,
  notes: string,
): Promise<ActionResult> {
  await requireAdmin();
  return updateExistingOrder(id, { adminNotes: notes.trim() || null });
}
