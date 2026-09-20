"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
} from "@/components/ui/carousel";
import { FotoProducto } from "@/components/tienda/foto-producto";
import { cn, FOCO_VISIBLE } from "@/lib/utils";

type Imagen = { id: string; url: string; alt: string };

/**
 * Galeria de la ficha. Foto principal en un Carousel de shadcn/embla con swipe
 * en mobile y flechas en desktop, y hasta cuatro miniaturas debajo para saltar
 * de foto.
 *
 * La miniatura activa se calcula con `indiceActual` del contexto de
 * `useCarousel()` -- que ya lee embla con `useSyncExternalStore` -- y no con
 * `setApi` + `useState` + `useEffect`, que es justo el patron que
 * `react-hooks/set-state-in-effect` prohibe en React 19.
 */
export function Galeria({ imagenes }: { imagenes: Imagen[] }) {
  if (imagenes.length === 0) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded border bg-card">
        <FotoProducto
          imagen={null}
          sizes="(min-width: 1024px) 620px, 100vw"
          prioridad
        />
      </div>
    );
  }

  return (
    <Carousel
      opts={{ loop: imagenes.length > 1 }}
      className="flex flex-col gap-3.5"
    >
      <div className="relative">
        <CarouselContent className="ml-0">
          {imagenes.map((imagen, indice) => (
            <CarouselItem key={imagen.id} className="pl-0">
              <div className="relative aspect-square w-full overflow-hidden rounded border bg-card">
                <FotoProducto
                  imagen={imagen}
                  sizes="(min-width: 1024px) 620px, 100vw"
                  prioridad={indice === 0}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {imagenes.length > 1 ? (
          <>
            <CarouselPrevious className="hidden lg:flex" />
            <CarouselNext className="hidden lg:flex" />
          </>
        ) : null}
      </div>

      {imagenes.length > 1 ? <Miniaturas imagenes={imagenes} /> : null}
    </Carousel>
  );
}

function Miniaturas({ imagenes }: { imagenes: Imagen[] }) {
  const { api, indiceActual } = useCarousel();

  return (
    <div className="grid grid-cols-4 gap-3.5">
      {imagenes.slice(0, 4).map((imagen, indice) => {
        const activa = indice === indiceActual;
        return (
          <button
            key={imagen.id}
            type="button"
            aria-label={`Ver foto ${indice + 1}`}
            aria-current={activa}
            onClick={() => api?.scrollTo(indice)}
            className={cn(
              "relative aspect-square overflow-hidden rounded border bg-card transition-colors",
              activa
                ? "border-foreground ring-1 ring-foreground"
                : "border-input",
              FOCO_VISIBLE,
            )}
          >
            <FotoProducto imagen={imagen} sizes="146px" />
          </button>
        );
      })}
    </div>
  );
}
