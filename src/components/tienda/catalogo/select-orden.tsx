"use client";

import { useQueryStates } from "nuqs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ETIQUETA_ORDEN,
  ORDENES,
  opcionesCatalogo,
  parsersCatalogo,
  type Orden,
} from "@/lib/tienda/filtros";

/** El select "Ordenar" del catalogo, compartido por desktop y mobile. */
export function SelectOrden({ className }: { className?: string }) {
  const [{ orden }, setFiltros] = useQueryStates(
    parsersCatalogo,
    opcionesCatalogo,
  );

  return (
    <Select
      value={orden}
      onValueChange={(valor) =>
        setFiltros({ orden: valor as Orden, pagina: 1 })
      }
    >
      <SelectTrigger aria-label="Ordenar" className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ORDENES.map((o) => (
          <SelectItem key={o} value={o}>
            {ETIQUETA_ORDEN[o]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
