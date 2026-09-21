"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveOrderNotes } from "../actions";

export function OrderNotes({
  id,
  initialNotes,
}: {
  id: string;
  initialNotes: string | null;
}) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [isPending, startTransition] = useTransition();

  function saveNotes() {
    startTransition(async () => {
      const result = await saveOrderNotes(id, notes);
      if (!result.ok) {
        toast.error(result.mensaje);
        return;
      }
      toast.success("Notas guardadas.");
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Ej: pagó por transferencia, retira el sábado..."
        className="min-h-24"
      />
      <div>
        <Button
          type="button"
          variant="outline"
          onClick={saveNotes}
          disabled={isPending}
        >
          Guardar notas
        </Button>
      </div>
    </div>
  );
}
