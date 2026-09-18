import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { urlAbsoluta } from "@/lib/seo";
import { urlsDelSitio } from "@/lib/tienda/consultas";

/**
 * `sitemap.ts` es un Route Handler cacheado por defecto (ver
 * node_modules/next/dist/docs/.../sitemap.md), y antes se apoyaba en
 * `export const revalidate = 3600` para eso. El problema: con `revalidate`,
 * Next lo prerenderiza en `next build`, y era la primera ruta que hacia
 * explotar un build sin Postgres -- que es justo el caso del build en CI.
 *
 * La revalidacion de una hora no se perdio, se bajo una capa: ahora la ruta se
 * resuelve por request (`force-dynamic`) pero la consulta vive en
 * `unstable_cache` con el mismo `revalidate: 3600`. Para el crawler el
 * resultado es el mismo (un producto nuevo tarda como mucho una hora en
 * aparecer) y lo unico que se paga de mas es armar el XML, que es memoria.
 */
export const dynamic = "force-dynamic";

const urlsCacheadas = unstable_cache(urlsDelSitio, ["sitemap-urls"], {
  revalidate: 3600,
});

const PAGINAS_ESTATICAS: {
  ruta: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}[] = [
  { ruta: "/", priority: 1, changeFrequency: "daily" },
  { ruta: "/catalogo", priority: 0.9, changeFrequency: "daily" },
  { ruta: "/que-es-un-tester", priority: 0.7, changeFrequency: "monthly" },
  { ruta: "/como-comprar", priority: 0.6, changeFrequency: "monthly" },
  { ruta: "/contacto", priority: 0.5, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { productos, marcas } = await urlsCacheadas();

  const estaticas: MetadataRoute.Sitemap = PAGINAS_ESTATICAS.map((p) => ({
    url: urlAbsoluta(p.ruta),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  const deProductos: MetadataRoute.Sitemap = productos.map((p) => ({
    url: urlAbsoluta(`/producto/${p.slug}`),
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const deMarcas: MetadataRoute.Sitemap = marcas.map((m) => ({
    url: urlAbsoluta(`/marca/${m.slug}`),
    lastModified: m.updatedAt,
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  return [...estaticas, ...deProductos, ...deMarcas];
}
