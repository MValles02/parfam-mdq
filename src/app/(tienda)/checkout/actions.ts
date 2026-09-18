"use server";

import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { ProductStatus } from "@/generated/prisma/enums";
import { obtenerConfiguracionSitio } from "@/lib/configuracion";
import { etiquetaVariante } from "@/lib/catalogo";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import type { RazonInvalido } from "@/lib/tienda/carrito-servidor";
import {
  armarMensajePedido,
  type LineaPedido,
} from "@/lib/tienda/mensaje-pedido";
import { checkoutSchema } from "@/lib/validations/checkout";
import { erroresPorCampo } from "@/lib/validations/errores";
import { linkWhatsappA } from "@/lib/whatsapp";

/**
 * El corazón del checkout. Tres cosas no se negocian acá (AGENTS.md):
 *   - el precio nunca sale del cliente, siempre se recalcula contra la base;
 *   - sólo se vende una variante `isActive` de un producto `PUBLISHED`;
 *   - el pedido guarda un snapshot (`OrderItem`) que un cambio de precio
 *     futuro no puede tocar.
 */

export type ItemInvalido = { variantId: string; razon: RazonInvalido };

export type ResultadoCheckout =
  | { ok: true; numero: string; link: string }
  | {
      ok: false;
      mensaje: string;
      errores?: Record<string, string[]>;
      /** Variantes que ya no se pueden vender: el cliente las saca del
       * carrito para poder reintentar sin volver a chocar con lo mismo. */
      invalidos?: ItemInvalido[];
    };

function fallo(
  mensaje: string,
  extra?: Partial<
    Omit<Extract<ResultadoCheckout, { ok: false }>, "ok" | "mensaje">
  >,
): ResultadoCheckout {
  return { ok: false, mensaje, ...extra };
}

/**
 * `empresa` es el honeypot: un campo que el formulario esconde visualmente
 * pero deja en el DOM, así que un bot que completa "todos los inputs" cae y
 * un humano nunca lo toca. No es parte de `checkoutSchema` a propósito — si
 * viniera lleno, el mensaje de rechazo tiene que ser el mismo genérico que
 * cualquier otro error, para no darle al bot una pista de qué evitar.
 */
export async function crearPedido(entrada: {
  nombre: unknown;
  telefono: unknown;
  items: unknown;
  empresa: unknown;
}): Promise<ResultadoCheckout> {
  if (typeof entrada.empresa === "string" && entrada.empresa.length > 0) {
    return fallo("No pudimos procesar el pedido. Probá de nuevo.");
  }

  // Ventana de 10 minutos / 5 intentos: la misma que el login (rate-limit.ts).
  // Un cliente real no manda más de un par de pedidos seguidos — y si algo
  // sale mal, reintenta a los pocos segundos, no cada minuto — así que esto
  // sólo frena scripts, no compradores.
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "desconocida";
  const limite = rateLimit(`checkout:${ip}`, {
    limit: 5,
    windowMs: 1000 * 60 * 10,
  });
  if (!limite.ok) {
    const minutos = Math.ceil(limite.retryAfter / 60);
    return fallo(
      `Demasiados intentos. Probá de nuevo en ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`,
    );
  }

  const parseado = checkoutSchema.safeParse(entrada);
  if (!parseado.success) {
    return fallo("Revisá los datos marcados.", {
      errores: erroresPorCampo(parseado.error),
    });
  }
  const { nombre, telefono, items } = parseado.data;

  const variantIds = items.map((i) => i.variantId);
  const variantes = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: {
      id: true,
      kind: true,
      sizeMl: true,
      priceArs: true,
      isActive: true,
      product: {
        select: {
          id: true,
          name: true,
          status: true,
          brand: { select: { name: true } },
        },
      },
    },
  });
  const porId = new Map(variantes.map((v) => [v.id, v]));

  const invalidos: ItemInvalido[] = [];
  const lineas: {
    productId: string;
    variantId: string;
    productName: string;
    brandName: string;
    variantLabel: string;
    qty: number;
    unitPriceArs: (typeof variantes)[number]["priceArs"];
  }[] = [];

  for (const item of items) {
    const v = porId.get(item.variantId);
    if (!v) {
      invalidos.push({ variantId: item.variantId, razon: "eliminada" });
    } else if (!v.isActive) {
      invalidos.push({ variantId: item.variantId, razon: "inactiva" });
    } else if (v.product.status !== ProductStatus.PUBLISHED) {
      invalidos.push({ variantId: item.variantId, razon: "despublicado" });
    } else {
      lineas.push({
        productId: v.product.id,
        variantId: v.id,
        productName: v.product.name,
        brandName: v.product.brand.name,
        variantLabel: etiquetaVariante(v.kind, v.sizeMl),
        qty: item.qty,
        unitPriceArs: v.priceArs,
      });
    }
  }

  // Esto es lo que la reconciliación de `/carrito` y `/checkout` debería
  // haber evitado (ver `useReconciliacionCarrito`), pero acá es el único
  // borde real: sin JS, con una pestaña vieja, o llamando la acción directo.
  if (invalidos.length > 0) {
    return fallo(
      invalidos.length === items.length
        ? "Ninguno de los productos de tu carrito sigue disponible."
        : "Algunos productos de tu carrito ya no están disponibles. Los sacamos — revisá y reintentá.",
      { invalidos },
    );
  }

  const config = await obtenerConfiguracionSitio();

  const resultado = await prisma.$transaction(async (tx) => {
    // Atómico por diseño: dos checkouts en paralelo nunca sacan el mismo
    // valor, y el rollback de un pedido fallido no recicla el número (ver la
    // migración numero_pedido_secuencia).
    const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
      SELECT nextval('"Order_number_seq"') AS nextval
    `;
    const numero = `PM-${String(nextval).padStart(4, "0")}`;

    const totalArs = lineas.reduce(
      (acc, l) => acc.plus(l.unitPriceArs.times(l.qty)),
      new Prisma.Decimal(0),
    );

    const pedido = await tx.order.create({
      data: {
        number: numero,
        customerName: nombre,
        customerPhone: telefono,
        totalArs,
        items: {
          create: lineas.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            productName: l.productName,
            variantLabel: l.variantLabel,
            unitPriceArs: l.unitPriceArs,
            qty: l.qty,
          })),
        },
      },
      select: { number: true, totalArs: true },
    });

    return pedido;
  });

  const lineasMensaje: LineaPedido[] = lineas.map((l) => ({
    brandName: l.brandName,
    productName: l.productName,
    variantLabel: l.variantLabel,
    qty: l.qty,
    subtotalArs: l.unitPriceArs.times(l.qty).toString(),
  }));

  const mensaje = armarMensajePedido({
    plantilla: config.whatsappMessageTemplate,
    marca: config.brandName,
    nombre,
    numero: resultado.number,
    items: lineasMensaje,
    totalArs: resultado.totalArs.toString(),
  });

  return {
    ok: true,
    numero: resultado.number,
    link: linkWhatsappA(config.whatsappNumber, mensaje),
  };
}
