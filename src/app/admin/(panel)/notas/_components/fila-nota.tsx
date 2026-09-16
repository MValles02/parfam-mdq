"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { borrarTraduccion, traducirNota } from "../actions";

const formatoNumero = new Intl.NumberFormat("es-AR");

export function FilaNota({
  id,
  nameEn,
  nameEs,
  usageCount,
}: {
  id: string;
  nameEn: string;
  nameEs: string | null;
  usageCount: number;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(nameEs ?? "");
  const [pendienteGuardar, iniciarGuardar] = useTransition();
  const [pendienteBorrar, iniciarBorrar] = useTransition();
  const yaTraducida = nameEs !== null;
  const pendiente = pendienteGuardar || pendienteBorrar;

  function guardar() {
    const limpio = valor.trim();
    if (limpio.length < 2) {
      toast.error("La traducción tiene que tener al menos 2 caracteres.");
      return;
    }
    iniciarGuardar(async () => {
      const resultado = await traducirNota(id, limpio);
      if (!resultado.ok) {
        toast.error(resultado.mensaje);
        return;
      }
      toast.success(`"${nameEn}" traducida.`);
      router.refresh();
    });
  }

  function deshacer() {
    iniciarBorrar(async () => {
      const resultado = await borrarTraduccion(id);
      if (!resultado.ok) {
        toast.error(resultado.mensaje);
        return;
      }
      setValor("");
      toast.success("Traducción borrada.");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
      className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 border-b border-border px-5 py-2.5 last:border-b-0"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{nameEn}</div>
        <div className="text-xs text-muted-foreground">
          en {formatoNumero.format(usageCount)} fragancias
        </div>
      </div>

      <Input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Traducción al español"
        disabled={pendiente}
        aria-label={`Traducción de ${nameEn}`}
        className="h-8 rounded text-sm"
      />

      <div className="flex items-center gap-1.5">
        <Button type="submit" size="sm" disabled={pendiente}>
          {yaTraducida ? "Actualizar" : "Guardar"}
        </Button>
        {yaTraducida ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pendiente}
            onClick={deshacer}
          >
            Deshacer
          </Button>
        ) : null}
      </div>
    </form>
  );
}
