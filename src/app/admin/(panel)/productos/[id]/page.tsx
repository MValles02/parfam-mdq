import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductForEdit, listAccords } from "@/lib/admin/products";
import { isR2Configured } from "@/lib/r2";
import { env } from "@/lib/env";
import { ProductForm } from "../_components/product-form";

export async function generateMetadata(
  props: PageProps<"/admin/productos/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const product = await getProductForEdit(id);
  return { title: product ? product.name : "Producto" };
}

export default async function Page(props: PageProps<"/admin/productos/[id]">) {
  const { id } = await props.params;
  const [product, accords] = await Promise.all([
    getProductForEdit(id),
    listAccords(),
  ]);
  if (!product) notFound();

  // The form renders its own sticky header (crumb, title, status and save
  // actions), so the page adds none.
  return (
    /* The key remounts the form after the server returns fresh data, keeping
       persisted variant and image IDs for the next save. */
    <ProductForm
      key={product.updatedAt.toISOString()}
      product={product}
      accords={accords}
      isR2Configured={isR2Configured()}
      publicBaseUrl={env.R2_PUBLIC_URL ?? null}
    />
  );
}
