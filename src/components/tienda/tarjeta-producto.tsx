import Link from "next/link";
import type { TarjetaProducto } from "@/lib/tienda/consultas";
import { precioArs } from "@/lib/catalogo";
import { FotoProducto } from "@/components/tienda/foto-producto";

/**
 * Tarjeta del catalogo (design/Main.dc.html y HomeMobile.dc.html). La usan la
 * grilla, la home y los relacionados de la ficha, asi que todo lo que muestra
 * ya viene armado desde `listarCatalogo` -- acá no se formatea nada salvo el
 * precio.
 */
export function TarjetaProductoCard({
  producto,
  prioridad = false,
  nivel: Nivel = "h2",
}: {
  producto: TarjetaProducto;
  prioridad?: boolean;
  /**
   * Nivel del encabezado del nombre. Tiene que ser uno mas que el titulo de
   * la seccion que contiene la grilla: si no, axe marca "heading order
   * invalid" y el lector de pantalla pierde la jerarquia.
   */
  nivel?: "h2" | "h3";
}) {
  return (
    <Link
      href={`/producto/${producto.slug}`}
      className="group flex flex-col overflow-hidden rounded border bg-card transition-colors hover:border-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="relative h-[180px] border-b bg-background sm:h-[260px]">
        {producto.etiqueta ? (
          <span className="absolute top-3 left-3 z-10 rounded-[3px] bg-primary px-2.5 py-1.5 text-[9px] leading-none font-bold tracking-[0.16em] text-primary-foreground">
            {producto.etiqueta}
          </span>
        ) : null}
        <FotoProducto
          imagen={producto.imagen}
          prioridad={prioridad}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5 sm:p-[18px]">
        <span className="text-[9px] font-bold tracking-[0.18em] text-muted-foreground uppercase sm:text-[10px]">
          {producto.marca}
        </span>
        <Nivel className="text-sm leading-tight font-bold tracking-[-0.015em] sm:text-lg">
          {producto.nombre}
        </Nivel>
        {producto.meta ? (
          <p className="hidden text-xs text-muted-foreground sm:block">
            {producto.meta}
          </p>
        ) : null}

        <div className="mt-auto flex items-baseline gap-1.5 pt-2">
          {producto.desde ? (
            <>
              <span className="text-[10px] text-muted-foreground sm:text-[11px]">
                desde
              </span>
              <span className="text-base font-bold tracking-[-0.02em] sm:text-xl">
                {precioArs(producto.desde)}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">
              Consultá el precio
            </span>
          )}
        </div>

        {producto.tamanios.length > 0 ? (
          <div className="hidden gap-1.5 pt-1 sm:flex">
            {producto.tamanios.map((t) => (
              <span
                key={t}
                className="rounded-[3px] border px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
