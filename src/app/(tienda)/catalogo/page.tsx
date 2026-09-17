import type { Metadata } from "next";
import Link from "next/link";
import { SeccionCatalogo } from "@/components/tienda/catalogo/seccion-catalogo";
import { opcionesDeFiltro } from "@/lib/tienda/consultas";
import { cargarFiltros } from "@/lib/tienda/filtros";
import { metadataDePagina } from "@/lib/seo";

export const metadata: Metadata = metadataDePagina({
  titulo: "Catálogo",
  descripcion:
    "Todos los perfumes, frascos, testers y decants de ParfamMdq: filtrá por género, presentación, marca, familia olfativa o precio.",
  ruta: "/catalogo",
});

export default async function Page(props: PageProps<"/catalogo">) {
  const [filtros, opciones] = await Promise.all([
    cargarFiltros(props.searchParams),
    opcionesDeFiltro(),
  ]);

  return (
    <>
      <div className="mx-auto max-w-[1440px] px-5 lg:px-16">
        <p className="pt-5 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Inicio
          </Link>
          {" · Catálogo"}
        </p>
      </div>
      <SeccionCatalogo
        titulo="Catálogo"
        filtros={filtros}
        opciones={opciones}
      />
    </>
  );
}
