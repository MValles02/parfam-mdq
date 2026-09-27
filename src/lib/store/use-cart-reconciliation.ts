"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  validateCartAction,
  type CartValidationResponseItem,
} from "@/app/(store)/carrito/actions";
import { useCart, useHydrated } from "@/lib/cart";
import type { InvalidReason } from "@/lib/store/server-cart";

/**
 * Reconciles cart state with the database for both /carrito and /checkout.
 *
 * Unavailable variants are removed with an explanatory toast. Price changes
 * update the cart and remain visible until the customer confirms them. The
 * database-backed total is always recalculated by createOrder.
 */

type PriceChange = {
  variantId: string;
  productName: string;
  variantLabel: string;
  previousPriceArs: string;
  currentPriceArs: string;
};

const INVALID_REASON_MESSAGES: Record<InvalidReason, string> = {
  inactive: "ya no está disponible",
  deleted: "ya no existe",
  unpublished: "ya no está a la venta",
};

/**
 * /carrito can mount this hook twice while the drawer is open. One module-level
 * request is shared for the same cart signature, which prevents duplicate
 * validation calls and toasts. The mounted instance that receives the result
 * applies effects even if the instance that initiated the request unmounted.
 */
let inFlightValidation: {
  signature: string;
  request: Promise<CartValidationResponseItem[]>;
  hasApplied: boolean;
} | null = null;

function getCartSignature(items: { variantId: string; qty: number }[]): string {
  return items
    .map((i) => `${i.variantId}:${i.qty}`)
    .sort()
    .join(",");
}

export function useCartReconciliation() {
  const hydrated = useHydrated();
  const items = useCart((state) => state.items);
  const remove = useCart((state) => state.remove);
  const updatePrice = useCart((state) => state.updatePrice);
  const [changes, setChanges] = useState<PriceChange[]>([]);
  // Set this only inside the promise callback, never synchronously in the
  // effect body. React 19's react-hooks/set-state-in-effect rule forbids the
  // latter. Rendering derives isChecking from this state.
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!hydrated || items.length === 0) return;

    let isCancelled = false;
    const signature = getCartSignature(items);

    if (!inFlightValidation || inFlightValidation.signature !== signature) {
      inFlightValidation = {
        signature,
        request: validateCartAction(
          items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
        ),
        hasApplied: false,
      };
    }
    const validation = inFlightValidation;

    validation.request.then((results) => {
      if (isCancelled) return;
      if (inFlightValidation === validation) inFlightValidation = null;

      // Only the first still-mounted instance applies shared cart effects.
      // Every instance keeps its own change list and readiness state.
      const shouldApply = !validation.hasApplied;
      validation.hasApplied = true;

      const detectedChanges: PriceChange[] = [];
      for (const result of results) {
        const item = items.find(
          (cartItem) => cartItem.variantId === result.variantId,
        );
        if (!item) continue;

        if (!result.ok) {
          if (shouldApply) {
            remove(result.variantId);
            toast.error(`Sacamos "${item.productName}" del carrito`, {
              description: `${item.variantLabel} ${INVALID_REASON_MESSAGES[result.reason]}.`,
            });
          }
          continue;
        }

        if (result.priceArs !== item.unitPriceArs) {
          detectedChanges.push({
            variantId: result.variantId,
            productName: item.productName,
            variantLabel: item.variantLabel,
            previousPriceArs: item.unitPriceArs,
            currentPriceArs: result.priceArs,
          });
          if (shouldApply) updatePrice(result.variantId, result.priceArs);
        }
      }
      if (detectedChanges.length > 0) setChanges(detectedChanges);
      setIsReady(true);
    });

    return () => {
      isCancelled = true;
    };
    // Run only after hydration. Depending on items would repeat the database
    // request after every quantity stepper change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  return {
    changes,
    discardChanges: () => setChanges([]),
    isChecking: hydrated && items.length > 0 && !isReady,
  };
}
