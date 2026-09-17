import type { Metadata } from "next";
import { obtenerConfiguracionSitio } from "@/lib/configuracion";
import { GraciasCliente } from "./_gracias-cliente";

export const metadata: Metadata = { title: "Pedido enviado" };

/**
 * No se consulta la base por `number` acá — ver el comentario en
 * `_gracias-cliente.tsx` sobre por qué esta página no confía en eso como
 * fuente de datos. El número de WhatsApp sí sale de la base (vía la config
 * cacheada): es el mismo dato en todos lados, no un fallback estático.
 */
export default async function Page(
  props: PageProps<"/pedido/[number]/gracias">,
) {
  const [{ number }, sp, config] = await Promise.all([
    props.params,
    props.searchParams,
    obtenerConfiguracionSitio(),
  ]);
  const link = typeof sp.link === "string" ? sp.link : null;

  return (
    <GraciasCliente
      numero={number}
      link={link}
      whatsappNumber={config.whatsappNumber}
    />
  );
}
