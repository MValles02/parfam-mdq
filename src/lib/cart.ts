"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Customer cart. The product page, header badge and drawer, /carrito page,
 * and checkout share it.
 *
 * Stored data is a display snapshot, not the source of truth: checkout
 * recalculates the price from the database. `unitPriceArs` is a string
 * because Prisma Decimal values are not serializable to Client Components.
 */

export type CartItem = {
  variantId: string;
  productSlug: string;
  productName: string;
  brandName: string;
  variantLabel: string;
  unitPriceArs: string;
  image: string | null;
  qty: number;
};

/**
 * Units of one variant a cart line can hold. It mirrors the server limit in
 * `src/lib/validations/checkout.ts`, which this module does not import so the
 * cart, loaded on every store page, does not bundle zod and libphonenumber.
 */
export const MAX_ITEM_QUANTITY = 99;

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (variantId: string) => void;
  /** Exact quantity, not an increment, for the drawer and /carrito stepper. */
  updateQuantity: (variantId: string, qty: number) => void;
  /**
   * Replaces a stored item price after database reconciliation. The cart is
   * a display snapshot, so a later admin price change must refresh it.
   */
  updatePrice: (variantId: string, unitPriceArs: string) => void;
  clear: () => void;
};

/** Applies `update` to the line of `variantId`, leaving the others as they are. */
function updateLine(
  items: CartItem[],
  variantId: string,
  update: (line: CartItem) => CartItem,
): CartItem[] {
  return items.map((line) =>
    line.variantId === variantId ? update(line) : line,
  );
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item, qty = 1) =>
        set((state) => {
          const isInCart = state.items.some(
            (line) => line.variantId === item.variantId,
          );
          if (!isInCart) return { items: [...state.items, { ...item, qty }] };
          return {
            items: updateLine(state.items, item.variantId, (line) => ({
              ...line,
              qty: Math.min(MAX_ITEM_QUANTITY, line.qty + qty),
            })),
          };
        }),
      remove: (variantId) =>
        set((state) => ({
          items: state.items.filter((line) => line.variantId !== variantId),
        })),
      updateQuantity: (variantId, qty) =>
        set((state) => ({
          items: updateLine(state.items, variantId, (line) => ({
            ...line,
            qty: Math.min(MAX_ITEM_QUANTITY, Math.max(1, qty)),
          })),
        })),
      updatePrice: (variantId, unitPriceArs) =>
        set((state) => ({
          items: updateLine(state.items, variantId, (line) => ({
            ...line,
            unitPriceArs,
          })),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      // Persisted browser contract: renaming the key discards every stored cart.
      name: "parfam-cart",
    },
  ),
);

const noSubscription = () => () => {};

/**
 * False on the server and first client render, then true after hydration.
 * `getServerSnapshot` keeps the initial client HTML equal to server HTML.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}

/** Returns zero until the client hydrates the stored cart. */
export function useCartQuantity(): number {
  const hydrated = useHydrated();
  const items = useCart((state) => state.items);
  if (!hydrated) return 0;
  return cartUnits(items);
}

/**
 * Accessible cart quantity text. This centralizes the Spanish plural rule for
 * the badge announcement and the drawer trigger label.
 */
export function cartLabel(quantity: number): string {
  return `Carrito: ${unitsLabel(quantity)}`;
}

/** Visible unit count text ("1 unidad", "N unidades") shared by cart surfaces. */
export function unitsLabel(units: number): string {
  return units === 1 ? "1 unidad" : `${units} unidades`;
}

/** Total units across every cart line. */
export function cartUnits(items: CartItem[]): number {
  return items.reduce((total, line) => total + line.qty, 0);
}

/** Line subtotal (unit price × quantity) as a two-decimal string, for display only. */
export function lineSubtotal(item: CartItem): string {
  return (Number(item.unitPriceArs) * item.qty).toFixed(2);
}

/**
 * Cart subtotal as a two-decimal string, for display only. It rounds the sum,
 * not each line.
 */
export function cartSubtotal(items: CartItem[]): string {
  return items
    .reduce((total, line) => total + Number(line.unitPriceArs) * line.qty, 0)
    .toFixed(2);
}
