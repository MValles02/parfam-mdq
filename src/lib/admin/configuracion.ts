import { prisma } from "@/lib/db";

export type ConfiguracionEditable = {
  whatsappNumber: string;
  whatsappMessageTemplate: string;
  instagramHandle: string;
  shippingInfo: string;
  seoDefaultTitle: string;
  seoDefaultDescription: string;
};

/**
 * Lectura sin cachear para precargar el formulario de `/admin/configuracion`.
 *
 * A diferencia de `obtenerConfiguracionSitio()` (la que usan el checkout y el
 * resto de la tienda, cacheada y con fallback a `siteDefaults`), acá interesa
 * el valor crudo: si un campo opcional está vacío en la base, el formulario
 * lo tiene que mostrar vacío (no el fallback de la tienda), para no guardar
 * ese fallback como si fuera texto elegido por el admin. La fila siempre
 * existe -- la siembra `prisma/seed.ts` -- así que no hace falta el
 * fallback de fila-ausente que sí tiene la versión pública.
 */
export async function obtenerConfiguracionEditable(): Promise<ConfiguracionEditable> {
  const fila = await prisma.siteSetting.findUniqueOrThrow({
    where: { id: "singleton" },
  });

  return {
    whatsappNumber: fila.whatsappNumber,
    whatsappMessageTemplate: fila.whatsappMessageTemplate,
    instagramHandle: fila.instagramHandle ?? "",
    shippingInfo: fila.shippingInfo ?? "",
    seoDefaultTitle: fila.seoDefaultTitle ?? "",
    seoDefaultDescription: fila.seoDefaultDescription ?? "",
  };
}
