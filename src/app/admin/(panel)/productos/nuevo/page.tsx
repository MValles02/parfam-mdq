import type { Metadata } from "next";
import { listAccords } from "@/lib/admin/products";
import { isR2Configured } from "@/lib/r2";
import { env } from "@/lib/env";
import { ProductForm } from "../_components/product-form";
import { ProductPageHeader } from "../_components/product-page-header";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function Page() {
  const accords = await listAccords();

  return (
    <>
      <ProductPageHeader breadcrumb="Nuevo" title="Nuevo producto" />

      <ProductForm
        product={null}
        accords={accords}
        isR2Configured={isR2Configured()}
        publicBaseUrl={env.R2_PUBLIC_URL ?? null}
      />
    </>
  );
}
