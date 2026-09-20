import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

/**
 * Cliente para Cloudflare R2 (compatible con la API de S3).
 *
 * Las credenciales son opcionales en `env.ts` porque el bucket todavia no
 * existe (ver AGENTS.md / la tarea de subida de imagenes): este modulo tiene
 * que poder importarse sin romper el build ni el arranque del server aunque
 * las cinco variables esten vacias. Por eso el cliente es perezoso -- se crea
 * recien cuando alguien pide subir o borrar algo, nunca al importar el modulo.
 */

const EXPIRACION_URL_SUBIDA_SEGUNDOS = 5 * 60;

/** true solo si estan las cinco variables necesarias para hablarle a R2. */
export function r2Configurado(): boolean {
  return Boolean(
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_BUCKET &&
    env.R2_PUBLIC_URL,
  );
}

/**
 * Junta las credenciales ya validadas o tira el error de "no configurado".
 * Centraliza el chequeo para que las funciones de abajo no lo repitan y para
 * poder usar `!` sin mentirle a TypeScript: si esto no tira, las variables
 * existen.
 */
function credenciales() {
  if (!r2Configurado()) {
    throw new Error("Cloudflare R2 todavía no está configurado.");
  }
  return {
    accountId: env.R2_ACCOUNT_ID!,
    accessKeyId: env.R2_ACCESS_KEY_ID!,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    bucket: env.R2_BUCKET!,
    publicUrl: env.R2_PUBLIC_URL!,
  };
}

// Cacheado en modulo, no en el import: la primera llamada real lo crea.
let cliente: S3Client | undefined;

function obtenerCliente(): S3Client {
  const { accountId, accessKeyId, secretAccessKey } = credenciales();
  if (!cliente) {
    cliente = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return cliente;
}

/**
 * Genera una URL firmada para subir un archivo por PUT directo desde el
 * navegador (el archivo nunca pasa por nuestro servidor). Expira rapido
 * porque solo sirve para la subida inmediata que la dispara.
 */
export async function urlDeSubida(opciones: {
  clave: string;
  contentType: string;
}): Promise<string> {
  const { bucket } = credenciales();
  const comando = new PutObjectCommand({
    Bucket: bucket,
    Key: opciones.clave,
    ContentType: opciones.contentType,
  });
  return getSignedUrl(obtenerCliente(), comando, {
    expiresIn: EXPIRACION_URL_SUBIDA_SEGUNDOS,
  });
}

/**
 * Arma la URL publica de un objeto a partir de su clave. Es total: devuelve
 * null si R2 no esta configurado, asi las consultas pueden pedirla sin tener
 * que chequear antes y la UI cae al placeholder de frasco.
 *
 * Esta es la unica funcion que sabe cual es el host publico. La base guarda
 * solo la clave (ver la migracion imagenes_guardan_clave), asi que cambiar de
 * dominio es cambiar R2_PUBLIC_URL y nada mas.
 */
export function urlPublica(clave: string): string | null {
  if (!env.R2_PUBLIC_URL) return null;
  return `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${clave}`;
}

/** Prefijo bajo el que vive todo lo que sube el panel. */
const PREFIJO_PRODUCTOS = "productos/";

/**
 * Las claves viajan por el formulario, asi que llegan al servidor como dato
 * del cliente. Esto es lo que evita que alguien mande "../" o apunte a un
 * objeto fuera del prefijo del panel.
 */
export function esClaveDeProducto(clave: string): boolean {
  return (
    clave.startsWith(PREFIJO_PRODUCTOS) &&
    !clave.includes("..") &&
    clave.length <= 512
  );
}

export async function borrarObjeto(clave: string): Promise<void> {
  const { bucket } = credenciales();
  await obtenerCliente().send(
    new DeleteObjectCommand({ Bucket: bucket, Key: clave }),
  );
}
