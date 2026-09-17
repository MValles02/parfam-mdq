"use client";

import { parseAsStringEnum, useQueryState } from "nuqs";
import { cn } from "@/lib/utils";
import type { FiltroEstadoPedido } from "@/lib/admin/pedidos";

const OPCIONES: { id: FiltroEstadoPedido; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "pendientes", label: "Pendientes" },
  { id: "confirmados", label: "Confirmados" },
  { id: "entregados", label: "Entregados" },
  { id: "cancelados", label: "Cancelados" },
];

export function TabsEstadoPedido() {
  const [estado, setEstado] = useQueryState(
    "estado",
    parseAsStringEnum<FiltroEstadoPedido>([
      "todos",
      "pendientes",
      "confirmados",
      "entregados",
      "cancelados",
    ])
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
