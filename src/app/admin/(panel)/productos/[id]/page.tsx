import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRODUCT_STATUS_LABELS as productStatusLabels } from "@/lib/catalog";
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

  return (
    <>
      <div className="border-b px-8 py-7">
        <p className="text-xs text-muted-foreground">
          <Link href="/admin/productos" className="hover:text-foreground">
            Productos
          </Link>
          {` · ${productStatusLabels[product.status]}`}
        </p>
        <h1 className="mt-1.5 text-3xl leading-none font-extrabold tracking-tight">
          {product.name}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {product.brand.name}
        </p>
      </div>

      {/* The key remounts the form after the server returns fresh data, keeping
          persisted variant and image IDs for the next save. */}
      <ProductForm
        key={product.updatedAt.toISOString()}
        product={product}
        accords={accords}
        isR2Configured={isR2Configured()}
        publicBaseUrl={env.R2_PUBLIC_URL ?? null}
      />
    </>
  );
}
