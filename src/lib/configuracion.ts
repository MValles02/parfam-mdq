import { prisma } from "@/lib/db";
import { siteDefaults } from "@/lib/site";

/**
 * Fila única `SiteSetting`, sembrada en la Fase 1 (`prisma/seed.ts`) y
 * editable desde `/admin/configuracion` a partir de la Fase 6. El checkout de
 * la Fase 5 ya lee de acá y no de `siteDefaults` — el número real y la
 * plantilla del mensaje son datos de la base, no una constante del código
 * (AGENTS.md).
 *
 * Vive fuera de `src/lib/site.ts` a propósito: ese archivo lo importan
 * Client Components (el header, por ejemplo) y no puede arrastrar Prisma.
 *
 * Sin `unstable_cache`: eso lo suma la Fase 6 junto con el formulario que
 * invalida el cache al guardar. Acá es una sola fila sin índice que se lee
 * una vez por checkout, no vale la pena cachear todavía.
 */
export async function obtenerConfiguracionSitio() {
  const fila = await prisma.siteSetting.findUnique({
    where: { id: "singleton" },
  });

  // No debería pasar (el seed la crea siempre), pero si la fila faltara, el
  // checkout no tiene por qué romperse: cae a los defaults del código.
  if (!fila) {
    return {
      whatsappNumber: siteDefaults.whatsapp,
      whatsappMessageTemplate:
        "¡Hola! Quiero hacer este pedido en {{marca}}:\n\n{{items}}\n\nTotal: {{total}}\n\nNombre: {{nombre}}\nPedido: {{numero}}",
      brandName: siteDefaults.name,
    };
  }

  return {
    whatsappNumber: fila.whatsappNumber,
    whatsappMessageTemplate: fila.whatsappMessageTemplate,
    brandName: fila.brandName,
  };
}
