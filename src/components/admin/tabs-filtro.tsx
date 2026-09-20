"use client";

import { parseAsInteger, parseAsStringEnum, useQueryStates } from "nuqs";
import { cn } from "@/lib/utils";

const formatoNumero = new Intl.NumberFormat("es-AR");

/**
 * Tabs de filtro por estado en la URL, compartidas por productos, pedidos y
 * notas: mismo parametro `estado` en los tres. `contadores` es opcional (hoy
 * solo notas muestra un numero al lado de cada tab). `resetPagina` es para
 * notas, la unica lista que pagina (mismo criterio que `BuscadorAdmin`).
 */
export function TabsFiltro<T extends string>({
  opciones,
  valorDefecto,
  contadores,
  resetPagina = false,
}: {
  opciones: { id: T; label: string }[];
  valorDefecto: T;
  contadores?: Record<T, number>;
  resetPagina?: boolean;
}) {
  const ids = opciones.map((o) => o.id) as [T, ...T[]];
  const [{ estado }, setState] = useQueryStates(
    {
      estado: parseAsStringEnum<T>(ids).withDefault(valorDefecto),
      pagina: parseAsInteger.withDefault(1),
    },
    { shallow: false, clearOnDefault: true },
  );

  return (
    <div className="flex items-center gap-2">
      {opciones.map((op) => {
        const activo = estado === op.id;
        return (
          <button
            key={op.id}
            type="button"
            onClick={() =>
              setState(
                resetPagina
                  ? { estado: op.id, pagina: null }
                  : { estado: op.id },
              )
            }
            className={cn(
              "rounded border px-3.5 py-1.5 text-[13px] font-medium",
              activo
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {op.label}
            {contadores ? (
              <>
                {" "}
                <span
                  className={cn(
                    activo
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground",
                  )}
                >
                  {formatoNumero.format(contadores[op.id])}
                </span>
              </>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
