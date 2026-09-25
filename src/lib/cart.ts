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

const MAX_QUANTITY = 99;

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

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item, qty = 1) =>
        set((state) => {
          const existingItem = state.items.find(
            (i) => i.variantId === item.variantId,
          );
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? {
                      ...i,
                      qty: Math.min(MAX_QUANTITY, i.qty + qty),
                    }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, qty }] };
        }),
      remove: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),
      updateQuantity: (variantId, qty) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId
              ? { ...i, qty: Math.min(MAX_QUANTITY, Math.max(1, qty)) }
              : i,
          ),
        })),
      updatePrice: (variantId, unitPriceArs) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId ? { ...i, unitPriceArs } : i,
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    {
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
  return items.reduce((total, i) => total + i.qty, 0);
}

/**
 * Accessible cart quantity text. This centralizes the Spanish plural rule for
 * the badge announcement and the drawer trigger label.
 */
export function cartLabel(quantity: number): string {
  return quantity === 1 ? "Carrito: 1 unidad" : `Carrito: ${quantity} unidades`;
}
