"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { type Resultado } from "@/lib/admin/resultado";
import {
  borrarObjeto,
  esClaveDeProducto,
  r2Configurado,
  urlDeSubida,
} from "@/lib/r2";

function fallo(mensaje: string): Resultado<never> {
  return { ok: false, mensaje };
}

/**
 * Lista blanca de tipos de imagen aceptados. Es una validacion de seguridad,
 * no cosmetica: la presigned URL se firma para un `Content-Type` puntual, asi
 * que el cliente no puede pedir que se firme para cualquier cosa.
 */
const EXTENSION_POR_TIPO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const OCHO_MB = 8 * 1024 * 1024;

const pedidoSchema = z.object({
  nombre: z.string().trim().min(1).max(200),
  contentType: z.enum(
    Object.keys(EXTENSION_POR_TIPO) as [string, ...string[]],
    "Ese formato de imagen no está permitido.",
  ),
  tamanioBytes: z
    .number()
    .int()
    .positive()
    .max(OCHO_MB, "La imagen no puede pesar más de 8 MB."),
});

export async function pedirUrlDeSubida(input: {
  nombre: string;
  contentType: string;
  tamanioBytes: number;
}): Promise<Resultado<{ urlDeSubida: string; storageKey: string }>> {
  await requireAdmin();

  const parseado = pedidoSchema.safeParse(input);
  if (!parseado.success) {
    return fallo(
      parseado.error.issues[0]?.message ?? "Esa imagen no es válida.",
    );
  }

  if (!r2Configurado()) {
    return fallo(
      "Cloudflare R2 todavía no está configurado. Avisale al equipo para cargar las credenciales.",
    );
  }

  const { contentType } = parseado.data;
  const extension = EXTENSION_POR_TIPO[contentType]!;

  // La clave la genera el servidor, nunca el cliente: usar el nombre de
  // archivo que manda el navegador abriria la puerta a path traversal y a
  // colisiones entre subidas de distintos admins.
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const clave = `productos/${anio}/${mes}/${randomUUID()}.${extension}`;

  const presignada = await urlDeSubida({ clave, contentType });

  // Se devuelve la clave, no la URL: el panel arma la vista previa con el
  // host que ya recibio del servidor, y la clave es lo unico que se persiste.
  return { ok: true, datos: { urlDeSubida: presignada, storageKey: clave } };
}

/**
 * Limpia una foto recien subida a R2 cuando el admin la descarta antes de
 * guardar el producto (si ya se guardo, borrarla del bucket queda a cargo del
 * flujo de guardado del producto, no de esta accion).
 */
export async function borrarImagenSubida(clave: string): Promise<Resultado> {
  await requireAdmin();

  // La clave la manda el cliente: sin este chequeo se podria pedir el borrado
  // de cualquier objeto del bucket, no solo de una foto de producto.
  if (!esClaveDeProducto(clave)) {
    return fallo("Esa imagen no es válida.");
  }
  if (!r2Configurado()) {
    return fallo("Cloudflare R2 todavía no está configurado.");
  }

  await borrarObjeto(clave);
  return { ok: true };
}
