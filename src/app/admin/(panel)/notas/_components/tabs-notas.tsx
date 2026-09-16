"use client";

import { parseAsInteger, parseAsStringEnum, useQueryStates } from "nuqs";
import { cn } from "@/lib/utils";

type FiltroEstadoNota = "pendientes" | "traducidas";

const OPCIONES: { id: FiltroEstadoNota; label: string }[] = [
  { id: "pendientes", label: "Pendientes" },
  { id: "traducidas", label: "Traducidas" },
];

const formatoNumero = new Intl.NumberFormat("es-AR");

export function TabsNotas({
  pendientes,
  traducidas,
}: {
  pendientes: number;
  traducidas: number;
}) {
  const [{ estado }, setState] = useQueryStates(
    {
      estado: parseAsStringEnum<FiltroEstadoNota>([
        "pendientes",
        "traducidas",
      ]).withDefault("pendientes"),
      pagina: parseAsInteger.withDefault(1),
    },
    { shallow: false, clearOnDefault: true },
  );

  const cantidades: Record<FiltroEstadoNota, number> = {
    pendientes,
    traducidas,
  };

  return (
    <div className="flex items-center gap-2">
      {OPCIONES.map((op) => {
        const activo = estado === op.id;
        return (
          <button
            key={op.id}
            type="button"
            onClick={() => setState({ estado: op.id, pagina: null })}
            className={cn(
              "rounded border px-3.5 py-1.5 text-[13px] font-medium",
              activo
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {op.label}{" "}
            <span
              className={cn(
                activo ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              {formatoNumero.format(cantidades[op.id])}
            </span>
          </button>
        );
      })}
    </div>
  );
}
