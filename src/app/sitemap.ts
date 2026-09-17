import type { MetadataRoute } from "next";
import { urlAbsoluta } from "@/lib/seo";
import { urlsDelSitio } from "@/lib/tienda/consultas";

/**
 * `sitemap.ts` es un Route Handler cacheado por defecto (ver
 * node_modules/next/dist/docs/.../sitemap.md). Como lee de la base con
 * `urlsDelSitio()`, necesita revalidarse: una hora es suficiente para que un
 * producto nuevo o despublicado aparezca/desaparezca sin recalcular en cada
 * request, que es gratis para el crawler pero caro para nosotros (`force-dynamic`
 * evitado a proposito).
 */
export const revalidate = 3600;

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
  const { productos, marcas } = await urlsDelSitio();

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
