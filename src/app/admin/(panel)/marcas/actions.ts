"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import { actionFailure, type ActionResult } from "@/lib/admin/action-result";
import { prisma } from "@/lib/db";
import { fieldErrors } from "@/lib/validations/errors";
import { brandSchema } from "@/lib/validations/brand";

/**
 * Every action in this file starts with `requireAdmin()`. A Server Action is
 * a public POST endpoint, so the `/admin` layout does not protect it.
 */

/**
 * Invalidates every store page that displays this brand name: the grid, home,
 * and each associated product page. Iterating product pages
 * is sufficient because each brand has relatively few store products.
 */
async function revalidateBrand(brandId: string) {
  const products = await prisma.product.findMany({
    where: { brandId },
    select: { slug: true },
  });

  revalidatePath("/");
  for (const product of products)
    revalidatePath(`/producto/${product.slug}`, "page");
}

export async function updateBrand(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure("Revisá el nombre.", fieldErrors(parsed.error));
  }

  const brand = await prisma.brand.update({
    where: { id },
    data: { name: parsed.data.name },
    select: { id: true, slug: true },
  });

  await revalidateBrand(brand.id);
  return { ok: true };
}
