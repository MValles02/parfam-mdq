"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Minus, MessageCircle, Plus } from "lucide-react";
import type { VariantKind } from "@/generated/prisma/enums";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { precioArs } from "@/lib/catalogo";
import { useCarrito } from "@/lib/carrito";
import { linkWhatsapp } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

type Variante = {
  id: string;
  kind: VariantKind;
  sizeMl: number | null;
  etiqueta: string;
  precio: string;
};

type ProductoComprar = {
  slug: string;
  nombre: string;
  marca: string;
  imagen: string | null;
};

const CANTIDAD_MAXIMA = 99;

const DESCRIPCION: Record<VariantKind, string> = {
  FULL_BOTTLE: "Sellado, con estuche",
  TESTER: "Nuevo, envase simple",
  DECANT: "Fraccionado en atomizador",
};

function mensajeConsulta(producto: ProductoComprar, variante?: Variante) {
  const presentacion = variante ? ` (${variante.etiqueta})` : "";
  return `¡Hola! Quería consultar por el ${producto.nombre} de ${producto.marca}${presentacion}.`;
}

/**
 * El corazon de la ficha: elegir presentacion, cantidad y mandar al carrito o
 * a WhatsApp. Es Client Component porque necesita estado local (variante
 * elegida, cantidad) que no vive en la URL -- a diferencia de los filtros del
 * catalogo, esto es efimero y no tiene sentido compartir por link.
 */
export function Comprar({
  producto,
  variantes,
}: {
  producto: ProductoComprar;
  variantes: Variante[];
}) {
  const idBase = useId();
  // La primera variante viene seleccionada de entrada: es el estado inicial
  // del useState, no un efecto que la elija despues del primer render.
  const [seleccionada, setSeleccionada] = useState<string | null>(
    variantes[0]?.id ?? null,
  );
  const [cantidad, setCantidad] = useState(1);
  const agregar = useCarrito((estado) => estado.agregar);

  if (variantes.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Consultanos el precio por WhatsApp
        </p>
        <Button asChild className="h-auto w-full gap-2 py-5 text-[15px]">
          <a
            href={linkWhatsapp(mensajeConsulta(producto))}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-4" />
            Consultar por WhatsApp
          </a>
        </Button>
      </div>
    );
  }

  const varianteActual =
    variantes.find((v) => v.id === seleccionada) ?? variantes[0];

  function decrementar() {
    setCantidad((c) => Math.max(1, c - 1));
  }

  function incrementar() {
    setCantidad((c) => Math.min(CANTIDAD_MAXIMA, c + 1));
  }

  function agregarAlCarrito() {
    agregar(
      {
        variantId: varianteActual.id,
        productSlug: producto.slug,
        productName: producto.nombre,
        brandName: producto.marca,
        variantLabel: varianteActual.etiqueta,
        unitPriceArs: varianteActual.precio,
        imagen: producto.imagen,
      },
      cantidad,
    );
    const unidad = cantidad === 1 ? "unidad" : "unidades";
    toast.success("Agregado al carrito", {
      description: `${producto.nombre} · ${varianteActual.etiqueta} · ${cantidad} ${unidad}`,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3.5 text-[11px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
          Elegí tu presentación
        </p>

        <RadioGroup
          value={seleccionada ?? undefined}
          onValueChange={setSeleccionada}
          className="gap-2.5"
        >
          {variantes.map((v) => {
            const activa = v.id === seleccionada;
            const id = `${idBase}-${v.id}`;
            return (
              <label
                key={v.id}
                htmlFor={id}
                className={cn(
                  // El grosor es siempre el mismo y solo cambia el color: con
                  // 1px vs 1.5px la fila se corre medio pixel al elegirla.
                  "flex cursor-pointer items-center justify-between rounded border-[1.5px] p-4",
                  activa ? "border-foreground" : "border-border",
                )}
              >
                <div className="flex items-center gap-3.5">
                  <RadioGroupItem value={v.id} id={id} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">
                      {v.etiqueta}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {DESCRIPCION[v.kind]}
                    </span>
                  </div>
                </div>
                <span className="text-lg font-bold">{precioArs(v.precio)}</span>
              </label>
            );
          })}
        </RadioGroup>

        {variantes.some((v) => v.kind === "TESTER") ? (
          // Fuera del <label>: un link adentro de la etiqueta de un radio
          // navega y encima selecciona la variante de paso.
          <p className="mt-3 text-xs text-muted-foreground">
            <Link
              href="/que-es-un-tester"
              className="underline underline-offset-2 hover:text-foreground"
            >
              ¿Qué es un tester?
            </Link>
          </p>
        ) : null}
      </div>

      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {varianteActual.etiqueta}
          </span>
          <span className="text-[38px] leading-none font-extrabold tracking-[-0.03em]">
            {precioArs(varianteActual.precio)}
          </span>
        </div>

        <div className="flex items-center gap-3 rounded border bg-card">
          <button
            type="button"
            aria-label="Quitar una unidad"
            onClick={decrementar}
            disabled={cantidad <= 1}
            className="p-3 text-muted-foreground disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>
          <span className="min-w-4 text-center text-base font-bold">
            {cantidad}
          </span>
          <button
            type="button"
            aria-label="Agregar una unidad"
            onClick={incrementar}
            disabled={cantidad >= CANTIDAD_MAXIMA}
            className="p-3 disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <Button
          type="button"
          onClick={agregarAlCarrito}
          className="h-auto w-full py-5 text-[15px] font-semibold"
        >
          Agregar al carrito · {varianteActual.etiqueta}
        </Button>

        <Button
          asChild
          variant="outline"
          className="h-auto w-full gap-2 py-4 text-[15px]"
        >
          <a
            href={linkWhatsapp(mensajeConsulta(producto, varianteActual))}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-4" />
            Consultar por WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
}
