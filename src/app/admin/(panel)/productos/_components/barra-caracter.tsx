"use client";

import { cn } from "@/lib/utils";

/**
 * Barra de carácter 1-5 (duración, estela, intensidad). En la tienda esto NO
 * se vota: lo fija el admin, así que es un control de cinco pasos y no un
 * promedio de nadie (ver PLAN.md, "Ratings de comunidad").
 */
export function BarraCaracter({
  valor,
  onChange,
  etiqueta,
  disabled,
}: {
  valor: number | null | undefined;
  onChange: (v: number | null) => void;
  etiqueta: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={etiqueta}>
      {[1, 2, 3, 4, 5].map((n) => {
        const activo = (valor ?? 0) >= n;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            aria-label={`${etiqueta}: ${n} de 5`}
            aria-pressed={activo}
            // Volver a tocar el paso actual lo deja sin dato, que es distinto
            // de "1 de 5" y es la unica forma de deshacer sin recargar.
            onClick={() => onChange(valor === n ? null : n)}
            className={cn(
              "h-7 flex-1 rounded-sm border transition-colors",
              activo
                ? "border-primary bg-primary"
                : "bg-background hover:border-muted-foreground",
              disabled && "opacity-50",
            )}
          />
        );
      })}
      <span className="ml-2 w-8 shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
        {valor ? `${valor}/5` : "—"}
      </span>
    </div>
  );
}
