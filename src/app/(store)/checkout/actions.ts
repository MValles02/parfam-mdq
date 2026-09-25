"use server";

import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { ProductStatus } from "@/generated/prisma/enums";
import { getSiteSettings } from "@/lib/settings";
import { getVariantLabel } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { siteDefaults } from "@/lib/site";
import type { InvalidReason } from "@/lib/store/server-cart";
import {
  buildOrderMessage,
  type OrderMessageLine,
} from "@/lib/store/order-message";
import { checkoutRequestSchema } from "@/lib/validations/checkout";
import { fieldErrors } from "@/lib/validations/errors";
import { buildWhatsAppLink } from "@/lib/whatsapp";

/**
 * Checkout's enforcement point. AGENTS.md requires that prices always come
 * from the database, only active variants of published products can sell, and
 * each order keeps an immutable OrderItem snapshot.
 */

type InvalidItem = { variantId: string; reason: InvalidReason };

export type CheckoutResult =
  | { ok: true; orderNumber: string; link: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
      /** Raw response fields let the client remove unavailable cart items
       * before the customer tries checkout again. */
      invalidItems?: InvalidItem[];
    };

function failure(
  message: string,
  extra?: Partial<
    Omit<Extract<CheckoutResult, { ok: false }>, "ok" | "message">
  >,
): CheckoutResult {
  return { ok: false, message, ...extra };
}

/**
 * `company` is the honeypot field. It remains in the DOM but is visually
 * hidden, which catches bots that complete every input. It deliberately stays
 * outside `checkoutRequestSchema` so a populated honeypot gets the same
 * generic response as every other rejected request.
 */
export async function createOrder(input: {
  customerName: unknown;
  customerPhone: unknown;
  items: unknown;
  company: unknown;
}): Promise<CheckoutResult> {
  const { company: honeypotValue } = input;
  if (typeof honeypotValue === "string" && honeypotValue.length > 0) {
    return failure("No pudimos procesar el pedido. Probá de nuevo.");
  }

  // Five attempts per ten minutes matches login rate limiting. A real customer
  // only submits a few orders close together, so this limits scripts without
  // blocking ordinary retries.
  const headerList = await headers();
  const clientIp =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown";
  const rateLimitResult = rateLimit(`checkout:${clientIp}`, {
    limit: 5,
    windowMs: 1000 * 60 * 10,
  });
  if (!rateLimitResult.ok) {
    const retryAfterMinutes = Math.ceil(rateLimitResult.retryAfter / 60);
    return failure(
      `Demasiados intentos. Probá de nuevo en ${retryAfterMinutes} ${retryAfterMinutes === 1 ? "minuto" : "minutos"}.`,
    );
  }

  const parsedInput = checkoutRequestSchema.safeParse(input);
  if (!parsedInput.success) {
    return failure("Revisá los datos marcados.", {
      fieldErrors: fieldErrors(parsedInput.error),
    });
  }
  const {
    customerName,
    customerPhone,
    items: requestedItems,
  } = parsedInput.data;

  const variantIds = requestedItems.map((item) => item.variantId);
  const variants = await prisma.productVariant.findMany({
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
  const variantsById = new Map(
    variants.map((variant) => [variant.id, variant]),
  );

  const invalidItems: InvalidItem[] = [];
  const orderLines: {
    productId: string;
    variantId: string;
    productName: string;
    brandName: string;
    variantLabel: string;
    qty: number;
    unitPriceArs: (typeof variants)[number]["priceArs"];
  }[] = [];

  for (const item of requestedItems) {
    const variant = variantsById.get(item.variantId);
    if (!variant) {
      invalidItems.push({
        variantId: item.variantId,
        reason: "deleted",
      });
    } else if (!variant.isActive) {
      invalidItems.push({
        variantId: item.variantId,
        reason: "inactive",
      });
    } else if (variant.product.status !== ProductStatus.PUBLISHED) {
      invalidItems.push({
        variantId: item.variantId,
        reason: "unpublished",
      });
    } else {
      orderLines.push({
        productId: variant.product.id,
        variantId: variant.id,
        productName: variant.product.name,
        brandName: variant.product.brand.name,
        variantLabel: getVariantLabel(variant.kind, variant.sizeMl),
        qty: item.qty,
        unitPriceArs: variant.priceArs,
      });
    }
  }

  // Cart reconciliation should catch these cases first, but this action is
  // the real boundary for requests without JavaScript, stale tabs, and direct
  // POST calls.
  if (invalidItems.length > 0) {
    return failure(
      invalidItems.length === requestedItems.length
        ? "Ninguno de los productos de tu carrito sigue disponible."
        : "Algunos productos de tu carrito ya no están disponibles. Los sacamos — revisá y reintentá.",
      { invalidItems },
    );
  }

  const settings = await getSiteSettings();

  const createdOrder = await prisma.$transaction(async (transaction) => {
    // The sequence makes concurrent checkouts unique, and rollbacks do not
    // reuse order numbers; the initial schema migration creates the sequence.
    const [{ nextval }] = await transaction.$queryRaw<{ nextval: bigint }[]>`
      SELECT nextval('"Order_number_seq"') AS nextval
    `;
    const orderNumber = `PM-${String(nextval).padStart(4, "0")}`;

    const totalArs = orderLines.reduce(
      (total, line) => total.plus(line.unitPriceArs.times(line.qty)),
      new Prisma.Decimal(0),
    );

    const order = await transaction.order.create({
      data: {
        number: orderNumber,
        customerName,
        customerPhone,
        totalArs,
        items: {
          create: orderLines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            productName: line.productName,
            variantLabel: line.variantLabel,
            unitPriceArs: line.unitPriceArs,
            qty: line.qty,
          })),
        },
      },
      select: { number: true, totalArs: true },
    });

    return order;
  });

  const messageLines: OrderMessageLine[] = orderLines.map((line) => ({
    brandName: line.brandName,
    productName: line.productName,
    variantLabel: line.variantLabel,
    qty: line.qty,
    subtotalArs: line.unitPriceArs.times(line.qty).toString(),
  }));

  const message = buildOrderMessage({
    template: settings.whatsappMessageTemplate,
    brand: siteDefaults.name,
    customerName,
    orderNumber: createdOrder.number,
    items: messageLines,
    totalArs: createdOrder.totalArs.toString(),
  });

  return {
    ok: true,
    orderNumber: createdOrder.number,
    link: buildWhatsAppLink(settings.whatsappNumber, message),
  };
}
