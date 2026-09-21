import type { Metadata } from "next";
import Link from "next/link";
import { listAccords } from "@/lib/admin/products";
import { isR2Configured } from "@/lib/r2";
import { env } from "@/lib/env";
import { ProductForm } from "../_components/product-form";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function Page() {
  const accords = await listAccords();

  return (
    <>
      <div className="border-b px-8 py-7">
        <p className="text-xs text-muted-foreground">
          <Link href="/admin/productos" className="hover:text-foreground">
            Productos
          </Link>
          {" · Nuevo"}
        </p>
        <h1 className="mt-1.5 text-3xl leading-none font-extrabold tracking-tight">
          Nuevo producto
        </h1>
      </div>

      <ProductForm
        product={null}
        accords={accords}
        isR2Configured={isR2Configured()}
        publicBaseUrl={env.R2_PUBLIC_URL ?? null}
      />
    </>
  );
}
