import type { Metadata } from "next";
import { Hero } from "@/components/tienda/hero";
import { SeccionCatalogo } from "@/components/tienda/catalogo/seccion-catalogo";
import { opcionesDeFiltro } from "@/lib/tienda/consultas";
import { cargarFiltros } from "@/lib/tienda/filtros";
import { metadataDePagina } from "@/lib/seo";
import { siteDefaults } from "@/lib/site";

export const metadata: Metadata = metadataDePagina({
  titulo: `${siteDefaults.name} — Perfumería`,
  descripcion: siteDefaults.description,
  ruta: "/",
});

/** Home: hero + catalogo. */
export default async function Page(props: PageProps<"/">) {
  const [filtros, opciones] = await Promise.all([
    cargarFiltros(props.searchParams),
    opcionesDeFiltro(),
  ]);

  return (
    <>
      <Hero />
      {/* El <h1> de la home es el logotipo del hero, asi que el catalogo
          entra un nivel mas abajo. */}
      <SeccionCatalogo
        titulo="Catálogo"
        nivelTitulo="h2"
        filtros={filtros}
        opciones={opciones}
      />
    </>
  );
}
