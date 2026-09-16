"use client";

import { parseAsStringEnum, useQueryState } from "nuqs";
import { cn } from "@/lib/utils";
import type { FiltroEstado } from "@/lib/admin/productos";

const OPCIONES: { id: FiltroEstado; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "publicados", label: "Publicados" },
  { id: "borradores", label: "Borradores" },
];

export function TabsEstado() {
  const [estado, setEstado] = useQueryState(
    "estado",
    parseAsStringEnum<FiltroEstado>(["todos", "publicados", "borradores"])
      .withDefault("todos")
      .withOptions({ shallow: false, clearOnDefault: true }),
  );

  return (
    <div className="flex items-center gap-2">
      {OPCIONES.map((op) => {
        const activo = estado === op.id;
        return (
          <button
            key={op.id}
            type="button"
            onClick={() => setEstado(op.id)}
            className={cn(
              "rounded border px-3.5 py-1.5 text-[13px] font-medium",
              activo
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {op.label}
          </button>
        );
      })}
    </div>
  );
}
