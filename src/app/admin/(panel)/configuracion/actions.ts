"use server";

import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import { type Resultado } from "@/lib/admin/resultado";
import { TAG_CONFIGURACION_SITIO } from "@/lib/configuracion";
import { prisma } from "@/lib/db";
import { erroresPorCampo } from "@/lib/validations/errores";
import { configuracionSchema } from "@/lib/validations/configuracion";

/**
 * Toda accion de este archivo arranca con `requireAdmin()`. Una Server Action
 * es un endpoint POST publico: el layout de /admin no la protege.
 */

export type { Resultado };

function fallo(mensaje: string, errores?: Record<string, string[]>): Resultado {
  return { ok: false, mensaje, errores };
}

/**
 * `SiteSetting` siempre tiene la fila `singleton` (la siembra
 * `prisma/seed.ts`): esto es siempre un update, nunca un create.
 */
export async function guardarConfiguracion(
  entrada: unknown,
): Promise<Resultado> {
  await requireAdmin();

  const parseado = configuracionSchema.safeParse(entrada);
  if (!parseado.success) {
    return fallo(
      "Revisá los campos marcados.",
      erroresPorCampo(parseado.error),
    );
  }
  const v = parseado.data;

  await prisma.siteSetting.update({
    where: { id: "singleton" },
    data: {
      whatsappNumber: v.whatsappNumber,
      whatsappMessageTemplate: v.whatsappMessageTemplate,
      brandName: v.brandName,
      brandTagline: v.brandTagline,
      instagramHandle: v.instagramHandle,
      shippingInfo: v.shippingInfo,
      seoDefaultTitle: v.seoDefaultTitle,
      seoDefaultDescription: v.seoDefaultDescription,
    },
  });

  // `{ expire: 0 }` en vez de un profile como "max": acá no vale
  // stale-while-revalidate -- el checkout del pedido siguiente (y el resto
  // de la tienda) tienen que ver el dato nuevo ya, no eventualmente.
  revalidateTag(TAG_CONFIGURACION_SITIO, { expire: 0 });

  return { ok: true };
}
