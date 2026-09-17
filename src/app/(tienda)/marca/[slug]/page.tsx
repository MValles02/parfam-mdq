import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SeccionCatalogo } from "@/components/tienda/catalogo/seccion-catalogo";
import { marcaPorSlug, opcionesDeFiltro } from "@/lib/tienda/consultas";
import { cargarFiltros } from "@/lib/tienda/filtros";
import { metadataDePagina } from "@/lib/seo";

/**
 * Catalogo de una marca (`/marca/[slug]`). El filtro de marca viene fijo por
 * la ruta: no se lee del query `marca` ni se muestra ese select.
 */
export async function generateMetadata(
  props: PageProps<"/marca/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const marca = await marcaPorSlug(slug);
  if (!marca) return {};

  return metadataDePagina({
    titulo: marca.name,
    descripcion: `Fragancias de ${marca.name}${marca.country ? ` (${marca.country})` : ""} en ParfamMdq: frascos, testers y decants.`,
    ruta: `/marca/${slug}`,
  });
}

export default async function Page(props: PageProps<"/marca/[slug]">) {
  const { slug } = await props.params;
  const [marca, opciones, filtrosUrl] = await Promise.all([
    marcaPorSlug(slug),
    opcionesDeFiltro(),
    cargarFiltros(props.searchParams),
  ]);
  if (!marca) notFound();

  const filtros = { ...filtrosUrl, marca: slug };

  // El nombre grande de la marca ya lo pone el encabezado de SeccionCatalogo
  // (mismo estilo 44px extrabold que "Catálogo" en las otras dos rutas): acá
  // no se repite en un <h1> aparte, para no duplicar el titulo de la pagina.
  return (
    <>
      <div className="mx-auto max-w-[1440px] px-5 lg:px-16">
        <p className="pt-5 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Inicio
          </Link>
          {" · "}
          <Link href="/catalogo" className="hover:text-foreground">
            Catálogo
          </Link>
          {` · ${marca.name}`}
        </p>
        {marca.country ? (
          <p className="mt-1 text-sm text-muted-foreground">{marca.country}</p>
        ) : null}
      </div>

      <SeccionCatalogo
        titulo={marca.name}
        filtros={filtros}
        opciones={opciones}
        marcaFija={slug}
      />
    </>
  );
}
