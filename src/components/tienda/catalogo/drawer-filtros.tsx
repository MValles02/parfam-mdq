"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useQueryStates } from "nuqs";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  contarFiltrosActivos,
  opcionesCatalogo,
  parsersCatalogo,
} from "@/lib/tienda/filtros";
import type { OpcionesDeFiltro } from "@/lib/tienda/consultas";
import {
  ChipsGenero,
  ChipsPresentacion,
  LimpiarFiltros,
  SelectFamiliaOlfativa,
  SelectMarca,
  SelectNota,
  SelectPrecio,
} from "./controles-filtro";
import { Buscador } from "./buscador";

/**
 * Drawer de filtros de mobile. Usa el `Sheet` de shadcn con `side="bottom"` --
 * ya esta instalado, no hace falta `vaul`.
 *
 * El contador del boton "Filtrar · N" se calcula en el cliente con
 * `contarFiltrosActivos`, sin pedirle nada al servidor: los valores ya estan
 * en la URL. `textoAplicar` en cambio sí necesita el total de resultados,
 * asi que llega ya resuelto (y ya envuelto en su propio `Suspense`) desde
 * `seccion-catalogo.tsx`, que es quien puede llamar a `listarCatalogo`.
 */
export function DrawerFiltros({
  opciones,
  marcaFija,
  textoAplicar,
}: {
  opciones: OpcionesDeFiltro;
  marcaFija?: string;
  textoAplicar: ReactNode;
}) {
  const [filtros] = useQueryStates(parsersCatalogo, opcionesCatalogo);
  const activos = contarFiltrosActivos(
    marcaFija ? { ...filtros, marca: null } : filtros,
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-12 flex-1 items-center justify-center gap-2.5 rounded border text-sm font-semibold transition-colors",
            activos > 0
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-muted",
          )}
        >
          <SlidersHorizontal className="size-4" />
          {activos > 0 ? `Filtrar · ${activos}` : "Filtrar"}
        </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="flex max-h-[88vh] flex-col gap-0 rounded-t-xl border-border px-5 pt-5 pb-6"
      >
        <SheetTitle className="text-[22px] font-extrabold tracking-[-0.02em]">
          Filtros
        </SheetTitle>

        <div className="mt-6 flex flex-1 flex-col gap-6 overflow-y-auto">
          {/* El mockup no dibuja el buscador adentro del drawer, pero en
              mobile este es el unico lugar donde entra: la lupa del header
              trae hasta acá y si no, la busqueda por texto quedaria siendo
              una funcion solo de escritorio. */}
          <div className="flex flex-col gap-[11px]">
            <span className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Buscar
            </span>
            <Buscador alto="h-[50px]" />
          </div>

          <div className="flex flex-col gap-[11px]">
            <span className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Género
            </span>
            <ChipsGenero tactil />
          </div>

          <div className="flex flex-col gap-[11px]">
            <span className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Presentación
            </span>
            <ChipsPresentacion tactil />
          </div>

          <div className="flex flex-col gap-2.5">
            {marcaFija ? null : (
              <SelectMarca
                opciones={opciones.marcas}
                className="h-[50px] w-full"
              />
            )}
            <SelectFamiliaOlfativa
              opciones={opciones.acordes}
              className="h-[50px] w-full"
            />
            <SelectNota opciones={opciones.notas} className="h-[50px] w-full" />
            <SelectPrecio className="h-[50px] w-full" />
          </div>
        </div>

        <div className="mt-6 flex gap-2.5">
          <SheetClose asChild>
            <LimpiarFiltros variante="boton" texto="Limpiar" />
          </SheetClose>
          <SheetClose asChild>
            <button
              type="button"
              className="flex h-[54px] flex-1 items-center justify-center rounded bg-primary text-[15px] font-semibold text-primary-foreground hover:bg-primary/80"
            >
              {textoAplicar}
            </button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
