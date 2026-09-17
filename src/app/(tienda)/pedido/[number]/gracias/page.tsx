import type { Metadata } from "next";
import { GraciasCliente } from "./_gracias-cliente";

export const metadata: Metadata = { title: "Pedido enviado" };

/**
 * No se consulta la base acá — ver el comentario en `_gracias-cliente.tsx`
 * sobre por qué esta página no confía en `number` como fuente de datos.
 */
export default async function Page(
  props: PageProps<"/pedido/[number]/gracias">,
) {
  const [{ number }, sp] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const link = typeof sp.link === "string" ? sp.link : null;

  return <GraciasCliente numero={number} link={link} />;
}
