import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import type { OpcionesDeFiltro } from "@/lib/tienda/consultas";
import { Buscador } from "./buscador";
import {
  ChipsGenero,
  ChipsPresentacion,
  LimpiarFiltros,
  SelectFamiliaOlfativa,
  SelectMarca,
  SelectNota,
  SelectPrecio,
} from "./controles-filtro";

function Fila({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-[104px] shrink-0 text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
        {etiqueta}
      </span>
      {children}
    </div>
  );
}

/**
 * Caja de filtros de escritorio.
 * En `/marca/[slug]` la marca ya viene fija por la ruta, asi que no se
 * muestra el select de Marca.
 */
export function PanelFiltros({
  opciones,
  marcaFija,
}: {
  opciones: OpcionesDeFiltro;
  marcaFija?: string;
}) {
  return (
    <div className="flex flex-col gap-[18px] rounded border border-border bg-card p-[22px_24px]">
      <Fila etiqueta="BUSCAR">
        <Buscador />
      </Fila>

      <Fila etiqueta="GÉNERO">
        <ChipsGenero />
      </Fila>

      <Fila etiqueta="PRESENTACIÓN">
        <ChipsPresentacion />
      </Fila>

      <Separator />

      <div className="flex flex-wrap items-center gap-3">
        {marcaFija ? null : (
          <SelectMarca opciones={opciones.marcas} className="min-w-[210px]" />
        )}
        <SelectFamiliaOlfativa
          opciones={opciones.acordes}
          className="min-w-[210px]"
        />
        <SelectNota opciones={opciones.notas} className="min-w-[210px]" />
        <SelectPrecio className="min-w-[210px]" />
        <div className="flex-1" />
        <LimpiarFiltros />
      </div>
    </div>
  );
}
