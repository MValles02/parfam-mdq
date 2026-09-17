"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { guardarNotasPedido } from "../actions";

export function NotasPedido({
  id,
  notasIniciales,
}: {
  id: string;
  notasIniciales: string | null;
}) {
  const [notas, setNotas] = useState(notasIniciales ?? "");
  const [pendiente, iniciar] = useTransition();

  function guardar() {
    iniciar(async () => {
      const resultado = await guardarNotasPedido(id, notas);
      if (!resultado.ok) {
        toast.error(resultado.mensaje);
        return;
      }
      toast.success("Notas guardadas.");
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        placeholder="Ej: pagó por transferencia, retira el sábado..."
        className="min-h-24"
      />
      <div>
        <Button
          type="button"
          variant="outline"
          onClick={guardar}
          disabled={pendiente}
        >
          Guardar notas
        </Button>
      </div>
    </div>
  );
}
