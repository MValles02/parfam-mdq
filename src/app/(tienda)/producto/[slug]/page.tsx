import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CONCENTRACION, GENERO } from "@/lib/catalogo";
import {
  jsonLd,
  metadataDePagina,
  migasJsonLd,
  productoJsonLd,
} from "@/lib/seo";
import { productoPorSlug, relacionados } from "@/lib/tienda/consultas";
import { ChipAcorde } from "@/components/tienda/chip-acorde";
import { TarjetaProductoCard } from "@/components/tienda/tarjeta-producto";
import { Separator } from "@/components/ui/separator";
import { Galeria } from "@/components/tienda/producto/galeria";
import { Comprar } from "@/components/tienda/producto/comprar";
import { Piramide } from "@/components/tienda/producto/piramide";
import { FichaTecnica } from "@/components/tienda/producto/ficha-tecnica";
import { BarrasCaracter } from "@/components/tienda/producto/barras-caracter";

/**
 * Ficha de producto (design/Producto.dc.html). `productoPorSlug` ya devuelve
 * null para un borrador -- por eso `notFound()` alcanza para que un slug de
 * borrador de 404 sin importar que nadie lo linkee desde el catalogo.
 */
export async function generateMetadata(
  props: PageProps<"/producto/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const producto = await productoPorSlug(slug);
  if (!producto) return {};

  const meta = [
    producto.marca,
    producto.concentracion ? CONCENTRACION[producto.concentracion] : null,
    producto.genero ? GENERO[producto.genero] : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return metadataDePagina({
    titulo: producto.seoTitle ?? `${producto.nombre} — ${producto.marca}`,
    descripcion:
      producto.seoDescription ??
      producto.descripcion ??
      `${producto.nombre} — ${meta}.`,
    ruta: `/producto/${producto.slug}`,
  });
}

export default async function Page(props: PageProps<"/producto/[slug]">) {
  const { slug } = await props.params;
  const producto = await productoPorSlug(slug);
  if (!producto) notFound();

  const productosRelacionados = await relacionados({
    id: producto.id,
    marcaSlug: producto.marcaSlug,
    acordes: producto.acordes,
  });

  const lineaMeta = [
    producto.concentracion ? CONCENTRACION[producto.concentracion] : null,
    producto.anio ? String(producto.anio) : null,
    producto.genero ? GENERO[producto.genero] : null,
    producto.perfumistas.length > 0 ? producto.perfumistas.join(", ") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const migas = [
    { nombre: "Inicio", ruta: "/" },
    { nombre: "Catálogo", ruta: "/catalogo" },
    { nombre: producto.marca, ruta: `/marca/${producto.marcaSlug}` },
    { nombre: producto.nombre, ruta: `/producto/${producto.slug}` },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            productoJsonLd(
              producto,
              producto.imagenes.map((imagen) => imagen.url),
            ),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(migasJsonLd(migas)) }}
      />

      <div className="mx-auto max-w-[1440px] px-5 lg:px-16">
        <p className="pt-5 text-xs text-muted-foreground">
          <Link href="/catalogo" className="hover:text-foreground">
            Catálogo
          </Link>
          {" · "}
          <Link
            href={`/marca/${producto.marcaSlug}`}
            className="hover:text-foreground"
          >
            {producto.marca}
          </Link>
          {` · ${producto.nombre}`}
        </p>

        <div className="flex flex-col gap-9 py-7 lg:flex-row lg:gap-14">
          <div className="lg:w-[620px] lg:shrink-0">
            <Galeria imagenes={producto.imagenes} />
          </div>

          <div className="flex flex-1 flex-col">
            <Link
              href={`/marca/${producto.marcaSlug}`}
              className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase hover:text-foreground"
            >
              {producto.marca}
            </Link>
            <h1 className="mt-2 text-[32px] leading-[1.05] font-extrabold tracking-[-0.035em] lg:text-[52px]">
              {producto.nombre}
            </h1>
            {lineaMeta ? (
              <p className="mt-2.5 text-sm text-muted-foreground">
                {lineaMeta}
              </p>
            ) : null}

            {producto.acordes.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {producto.acordes.map((acorde) => (
                  <ChipAcorde
                    key={acorde.slug}
                    nombre={acorde.nombre}
                    color={acorde.color}
                  />
                ))}
              </div>
            ) : null}

            {producto.descripcion ? (
              <p className="mt-6 max-w-prose text-base leading-relaxed">
                {producto.descripcion}
              </p>
            ) : null}

            <Separator className="my-7" />

            <Comprar
              producto={{
                slug: producto.slug,
                nombre: producto.nombre,
                marca: producto.marca,
                imagen: producto.imagenes[0]?.url ?? null,
              }}
              variantes={producto.variantes}
            />

            <p className="mt-6 text-xs text-muted-foreground">
              Envío en Mar del Plata · Retiro a convenir · 100% original
            </p>
          </div>
        </div>

        <Piramide piramide={producto.piramide} />

        <section className="grid grid-cols-1 gap-6 border-t pt-11 lg:grid-cols-2">
          <FichaTecnica
            marca={producto.marca}
            marcaSlug={producto.marcaSlug}
            perfumistas={producto.perfumistas}
            anio={producto.anio}
            concentracion={producto.concentracion}
            genero={producto.genero}
            estaciones={producto.estaciones}
            ocasiones={producto.ocasiones}
          />
          <BarrasCaracter
            duracion={producto.duracion}
            estela={producto.estela}
            intensidad={producto.intensidad}
          />
        </section>

        {productosRelacionados.length > 0 ? (
          <section className="border-t py-11">
            <h2 className="text-[32px] font-extrabold tracking-[-0.025em]">
              Te puede gustar
            </h2>
            <div className="mt-7 grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-7">
              {productosRelacionados.map((relacionado) => (
                <TarjetaProductoCard
                  key={relacionado.slug}
                  producto={relacionado}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
