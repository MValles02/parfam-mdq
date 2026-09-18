import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { urlAbsoluta } from "@/lib/seo";
import { TAG_SITEMAP_URLS, urlsDelSitio } from "@/lib/tienda/consultas";

/**
 * `sitemap.ts` es un Route Handler cacheado por defecto (ver
 * node_modules/next/dist/docs/.../sitemap.md), y antes se apoyaba en
 * `export const revalidate = 3600` para eso. El problema: con `revalidate`,
 * Next lo prerenderiza en `next build`, y era la primera ruta que hacia
 * explotar un build sin Postgres -- que es justo el caso del build en CI.
 *
 * La revalidacion de una hora no se perdio, se bajo una capa: ahora la ruta se
 * resuelve por request (`force-dynamic`) pero la consulta vive en
 * `unstable_cache` con el mismo `revalidate: 3600` como tope. El tag
 * `TAG_SITEMAP_URLS` acorta esa espera: las Server Actions que publican,
 * borran o cambian el slug de un producto la invalidan con
 * `revalidateTag(TAG_SITEMAP_URLS, "max")`, que sí funciona contra
 * `unstable_cache` (a diferencia de `revalidatePath`, que sólo invalida caché
 * de rutas — ver F-04 en `docs/findings.md`). Con perfil `"max"` la próxima
 * visita sirve el sitemap viejo mientras se recalcula en el fondo, así que en
 * la práctica un producto nuevo aparece en la siguiente visita a
 * `/sitemap.xml`, no en la hora del `revalidate` de arriba.
 */
export const dynamic = "force-dynamic";

const urlsCacheadas = unstable_cache(urlsDelSitio, ["sitemap-urls"], {
  revalidate: 3600,
  tags: [TAG_SITEMAP_URLS],
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
