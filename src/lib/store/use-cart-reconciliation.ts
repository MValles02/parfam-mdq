"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { toast } from "sonner";
import { validateCartAction } from "@/app/(store)/carrito/actions";
import { useCart, useHydrated, type CartItem } from "@/lib/cart";
import type {
  CartValidationItem,
  InvalidReason,
} from "@/lib/store/server-cart";

/**
 * Reconciles cart state with the database for both /carrito and /checkout.
 *
 * Unavailable variants are removed with an explanatory toast. Price changes
 * update the cart and remain visible until the customer confirms them. The
 * database-backed total is always recalculated by createOrder.
 */

export type PriceChange = {
  variantId: string;
  productName: string;
  variantLabel: string;
  previousPriceArs: string;
  currentPriceArs: string;
};

type CartDiscrepancy =
  | { kind: "unavailable"; item: CartItem; reason: InvalidReason }
  | { kind: "priceChange"; change: PriceChange };

/**
 * Compares the stored cart with the database results, in result order.
 * Results for variants that are no longer in the cart are ignored.
 */
export function findCartDiscrepancies(
  items: CartItem[],
  results: CartValidationItem[],
): CartDiscrepancy[] {
  const discrepancies: CartDiscrepancy[] = [];
  for (const result of results) {
    const item = items.find(
      (cartItem) => cartItem.variantId === result.variantId,
    );
    if (!item) continue;

    if (!result.ok) {
      discrepancies.push({ kind: "unavailable", item, reason: result.reason });
    } else if (result.priceArs !== item.unitPriceArs) {
      discrepancies.push({
        kind: "priceChange",
        change: {
          variantId: result.variantId,
          productName: item.productName,
          variantLabel: item.variantLabel,
          previousPriceArs: item.unitPriceArs,
          currentPriceArs: result.priceArs,
        },
      });
    }
  }
  return discrepancies;
}

/**
 * Price-change notices live in a module store, not per-hook state, so a
 * customer who sees the cart first (drawer or /carrito) still gets the same
 * notice at checkout until they confirm it.
 */
const usePriceChanges = create<{
  changes: PriceChange[];
  setChanges: (changes: PriceChange[]) => void;
}>((set) => ({ changes: [], setChanges: (changes) => set({ changes }) }));

const INVALID_REASON_MESSAGES: Record<InvalidReason, string> = {
  inactive: "ya no está disponible",
  deleted: "ya no existe",
  unpublished: "ya no está a la venta",
};

function notifyRemoval(item: CartItem, reason: InvalidReason) {
  toast.error(`Sacamos "${item.productName}" del carrito`, {
    description: `${item.variantLabel} ${INVALID_REASON_MESSAGES[reason]}.`,
  });
}

/**
 * /carrito can mount this hook twice while the drawer is open. One module-level
 * request is shared for the same cart signature, which prevents duplicate
 * validation calls and toasts. The mounted instance that receives the result
 * applies effects even if the instance that initiated the request unmounted.
 */
let inFlightValidation: {
  signature: string;
  request: Promise<CartValidationItem[]>;
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
  const changes = usePriceChanges((state) => state.changes);
  const setChanges = usePriceChanges((state) => state.setChanges);
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
      // Every instance keeps its own readiness state; the change list is shared.
      const shouldApply = !validation.hasApplied;
      validation.hasApplied = true;

      const detectedChanges: PriceChange[] = [];
      for (const discrepancy of findCartDiscrepancies(items, results)) {
        if (discrepancy.kind === "unavailable") {
          if (shouldApply) {
            remove(discrepancy.item.variantId);
            notifyRemoval(discrepancy.item, discrepancy.reason);
          }
          continue;
        }

        const { change } = discrepancy;
        detectedChanges.push(change);
        if (shouldApply) updatePrice(change.variantId, change.currentPriceArs);
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
