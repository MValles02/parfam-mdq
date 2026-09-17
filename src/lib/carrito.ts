"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Carrito del cliente. La Fase 5 le suma el drawer, /carrito y el checkout por
 * WhatsApp; esto es lo minimo que necesita la ficha de producto: agregar un
 * item y contar cuantos hay para el badge del header.
 *
 * Lo que se guarda es un snapshot para mostrar, no la fuente de verdad: el
 * precio que vale es el que la Server Action del checkout recalcula contra la
 * base (AGENTS.md). Por eso `unitPriceArs` es un string --- el Decimal de
 * Prisma ya viene convertido--- y nunca un float.
 */

export type ItemCarrito = {
  variantId: string;
  productSlug: string;
  productName: string;
  brandName: string;
  variantLabel: string;
  unitPriceArs: string;
  imagen: string | null;
  qty: number;
};

type EstadoCarrito = {
  items: ItemCarrito[];
  agregar: (item: Omit<ItemCarrito, "qty">, qty?: number) => void;
  quitar: (variantId: string) => void;
  vaciar: () => void;
};

export const useCarrito = create<EstadoCarrito>()(
  persist(
    (set) => ({
      items: [],
      agregar: (item, qty = 1) =>
        set((estado) => {
          const existente = estado.items.find(
            (i) => i.variantId === item.variantId,
          );
          if (existente) {
            return {
              items: estado.items.map((i) =>
                i.variantId === item.variantId ? { ...i, qty: i.qty + qty } : i,
              ),
            };
          }
          return { items: [...estado.items, { ...item, qty }] };
        }),
      quitar: (variantId) =>
        set((estado) => ({
          items: estado.items.filter((i) => i.variantId !== variantId),
        })),
      vaciar: () => set({ items: [] }),
    }),
    { name: "parfam-carrito", version: 1 },
  ),
);

const sinSuscripcion = () => () => {};

/**
 * false en el servidor y en el primer render del cliente, true despues de
 * hidratar. React usa `getServerSnapshot` tambien durante la hidratacion, asi
 * que el primer HTML del cliente coincide con el del servidor y recien en el
 * render siguiente aparece lo que haya en localStorage.
 *
 * Esto es lo que evita que el badge del carrito rompa la hidratacion en
 * silencio, y se hace sin `useEffect` porque la regla
 * `react-hooks/set-state-in-effect` de React 19 lo marca como error.
 */
export function useHidratado(): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );
}

/** Unidades en el carrito. Devuelve 0 hasta que el cliente hidrata. */
export function useCantidadCarrito(): number {
  const hidratado = useHidratado();
  const items = useCarrito((estado) => estado.items);
  if (!hidratado) return 0;
  return items.reduce((total, i) => total + i.qty, 0);
}
