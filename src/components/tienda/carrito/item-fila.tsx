"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { precioArs } from "@/lib/catalogo";
import { useCarrito, type ItemCarrito } from "@/lib/carrito";

const CANTIDAD_MAXIMA = 99;

/**
 * Miniatura del item, con el mismo placeholder de frasco que usa la tabla
 * de productos del panel (`tabla-productos.tsx`, componente `Miniatura`),
 * adaptado a la paleta de la tienda.
 */
function Miniatura({ imagen, alt }: { imagen: string | null; alt: string }) {
  if (imagen) {
    return (
      <div className="h-24 w-[74px] shrink-0 overflow-hidden rounded-sm border border-border bg-muted">
        <Image
          src={imagen}
          alt={alt}
          width={74}
          height={96}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex h-24 w-[74px] shrink-0 items-center justify-center rounded-sm border border-border bg-background">
      <svg
        width="40"
        height="64"
        viewBox="0 0 120 190"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="44"
          y="6"
          width="32"
          height="26"
          rx="3"
          className="fill-border"
        />
        <rect
          x="18"
          y="46"
          width="84"
          height="134"
          rx="4"
          className="fill-muted stroke-border"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}

/**
 * Una fila del carrito: imagen, marca, nombre, variante, stepper de cantidad y
 * precio de la linea. La usan tanto el drawer como `/carrito` a traves de
 * `ListaItems`.
 */
export function ItemFila({
  item,
  onNavegar,
}: {
  item: ItemCarrito;
  onNavegar?: () => void;
}) {
  const actualizarCantidad = useCarrito((estado) => estado.actualizarCantidad);
  const quitar = useCarrito((estado) => estado.quitar);
  const subtotalLinea = (Number(item.unitPriceArs) * item.qty).toFixed(2);

  return (
    <div className="flex gap-4 rounded border border-border bg-card p-3.5">
      <Link
        href={`/producto/${item.productSlug}`}
        onClick={onNavegar}
        className="shrink-0"
      >
        <Miniatura imagen={item.imagen} alt={item.productName} />
      </Link>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
              {item.brandName}
            </span>
            <Link
              href={`/producto/${item.productSlug}`}
              onClick={onNavegar}
              className="text-[15px] leading-tight font-bold tracking-[-0.01em] hover:text-muted-foreground"
            >
              {item.productName}
            </Link>
            <span className="text-xs text-muted-foreground">
              {item.variantLabel}
            </span>
          </div>
          <button
            type="button"
            aria-label={`Quitar ${item.productName} del carrito`}
            onClick={() => quitar(item.variantId)}
            className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center rounded border border-border bg-background">
            <button
              type="button"
              aria-label="Quitar una unidad"
              onClick={() => actualizarCantidad(item.variantId, item.qty - 1)}
              disabled={item.qty <= 1}
              className="p-2 text-muted-foreground disabled:opacity-40"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="min-w-[18px] text-center text-[13px] font-bold">
              {item.qty}
            </span>
            <button
              type="button"
              aria-label="Agregar una unidad"
              onClick={() => actualizarCantidad(item.variantId, item.qty + 1)}
              disabled={item.qty >= CANTIDAD_MAXIMA}
              className="p-2 disabled:opacity-40"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <span className="text-base font-bold tracking-[-0.02em]">
            {precioArs(subtotalLinea)}
          </span>
        </div>
      </div>
    </div>
  );
}
