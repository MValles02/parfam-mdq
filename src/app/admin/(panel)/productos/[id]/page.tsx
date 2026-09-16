import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ESTADO_PRODUCTO } from "@/lib/catalogo";
import { listarAcordes, productoParaEditar } from "@/lib/admin/productos";
import { r2Configurado } from "@/lib/r2";
import { ProductoForm } from "../_components/producto-form";

export async function generateMetadata(
  props: PageProps<"/admin/productos/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const producto = await productoParaEditar(id);
  return { title: producto ? producto.name : "Producto" };
}

export default async function Page(props: PageProps<"/admin/productos/[id]">) {
  const { id } = await props.params;
  const [producto, acordes] = await Promise.all([
    productoParaEditar(id),
    listarAcordes(),
  ]);
  if (!producto) notFound();

  return (
    <>
      <div className="border-b px-8 py-7">
        <p className="text-xs text-muted-foreground">
          <Link href="/admin/productos" className="hover:text-foreground">
            Productos
          </Link>
          {` · ${ESTADO_PRODUCTO[producto.status]}`}
        </p>
        <h1 className="mt-1.5 text-3xl leading-none font-extrabold tracking-tight">
          {producto.name}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {producto.brand.name}
        </p>
      </div>

      {/* La `key` fuerza el remonte cuando el servidor devuelve datos nuevos
          despues de guardar: sin eso el formulario seguiria con las variantes
          e imagenes sin id y el proximo guardado las duplicaria. */}
      <ProductoForm
        key={producto.updatedAt.toISOString()}
        producto={producto}
        acordes={acordes}
        r2Listo={r2Configurado()}
      />
    </>
  );
}
