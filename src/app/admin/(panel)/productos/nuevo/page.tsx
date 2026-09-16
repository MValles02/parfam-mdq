import type { Metadata } from "next";
import Link from "next/link";
import { listarAcordes } from "@/lib/admin/productos";
import { r2Configurado } from "@/lib/r2";
import { env } from "@/lib/env";
import { ProductoForm } from "../_components/producto-form";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function Page() {
  const acordes = await listarAcordes();

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

      <ProductoForm
        producto={null}
        acordes={acordes}
        r2Listo={r2Configurado()}
        basePublica={env.R2_PUBLIC_URL ?? null}
      />
    </>
  );
}
