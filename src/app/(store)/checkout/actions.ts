"use server";

import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { getSiteSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { siteDefaults } from "@/lib/site";
import {
  resolveCartLines,
  type InvalidReason,
  type ResolvedCartLine,
} from "@/lib/store/server-cart";
import {
  buildOrderMessage,
  type OrderMessageLine,
} from "@/lib/store/order-message";
import { checkoutRequestSchema } from "@/lib/validations/checkout";
import { fieldErrors } from "@/lib/validations/errors";
import { buildWhatsAppLink, formatOrderNumber } from "@/lib/whatsapp";

/**
 * Checkout's enforcement point. AGENTS.md requires that prices always come
 * from the database, only active variants of published products can sell, and
 * each order keeps an immutable OrderItem snapshot.
 */

type InvalidItem = { variantId: string; reason: InvalidReason };

type OrderLine = Extract<ResolvedCartLine, { ok: true }>;

type CheckoutFailure = {
  ok: false;
  message: string;
  fieldErrors?: Record<string, string[]>;
  /** Raw response fields let the client remove unavailable cart items
   * before the customer tries checkout again. */
  invalidItems?: InvalidItem[];
};

type CheckoutResult =
  { ok: true; orderNumber: string; link: string } | CheckoutFailure;

/**
 * Five attempts per ten minutes matches login rate limiting. A real customer
 * only submits a few orders close together, so this limits scripts without
 * blocking ordinary retries.
 */
const CHECKOUT_RATE_LIMIT = { limit: 5, windowMs: 1000 * 60 * 10 };

function failure(
  message: string,
  extra?: Omit<CheckoutFailure, "ok" | "message">,
): CheckoutFailure {
  return { ok: false, message, ...extra };
}

function tooManyAttemptsMessage(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Demasiados intentos. Probá de nuevo en ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`;
}

function splitAvailableLines(lines: ResolvedCartLine[]) {
  const orderLines: OrderLine[] = [];
  const invalidItems: InvalidItem[] = [];
  for (const line of lines) {
    if (line.ok) orderLines.push(line);
    else invalidItems.push({ variantId: line.variantId, reason: line.reason });
  }
  return { orderLines, invalidItems };
}

/**
 * Persists the order and its OrderItem snapshots with the database prices in
 * `lines`, numbering it inside the same transaction.
 */
async function saveOrder({
  customerName,
  customerPhone,
  lines,
}: {
  customerName: string;
  customerPhone: string;
  lines: OrderLine[];
}) {
  return prisma.$transaction(async (transaction) => {
    // The sequence makes concurrent checkouts unique, and rollbacks do not
    // reuse order numbers; the initial schema migration creates the sequence.
    const [{ nextval }] = await transaction.$queryRaw<{ nextval: bigint }[]>`
      SELECT nextval('"Order_number_seq"') AS nextval
    `;

    const totalArs = lines.reduce(
      (total, line) => total.plus(line.priceArs.times(line.qty)),
      new Prisma.Decimal(0),
    );

    return transaction.order.create({
      data: {
        number: formatOrderNumber(nextval),
        customerName,
        customerPhone,
        totalArs,
        items: {
          create: lines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            productName: line.productName,
            variantLabel: line.variantLabel,
            unitPriceArs: line.priceArs,
            qty: line.qty,
          })),
        },
      },
      select: { number: true, totalArs: true },
    });
  });
}

function toMessageLine(line: OrderLine): OrderMessageLine {
  return {
    brandName: line.brandName,
    productName: line.productName,
    variantLabel: line.variantLabel,
    qty: line.qty,
    subtotalArs: line.priceArs.times(line.qty).toString(),
  };
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

  const clientIp = getClientIp(await headers());
  const rateLimitResult = rateLimit(
    `checkout:${clientIp}`,
    CHECKOUT_RATE_LIMIT,
  );
  if (!rateLimitResult.ok) {
    return failure(tooManyAttemptsMessage(rateLimitResult.retryAfter));
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

  const { orderLines, invalidItems } = splitAvailableLines(
    await resolveCartLines(requestedItems),
  );

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
  const createdOrder = await saveOrder({
    customerName,
    customerPhone,
    lines: orderLines,
  });

  const message = buildOrderMessage({
    template: settings.whatsappMessageTemplate,
    brand: siteDefaults.name,
    customerName,
    orderNumber: createdOrder.number,
    items: orderLines.map(toMessageLine),
    totalArs: createdOrder.totalArs.toString(),
  });

  return {
    ok: true,
    orderNumber: createdOrder.number,
    link: buildWhatsAppLink(settings.whatsappNumber, message),
  };
}
