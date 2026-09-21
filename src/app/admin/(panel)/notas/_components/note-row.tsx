"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearNoteTranslation, translateNote } from "../actions";

const numberFormatter = new Intl.NumberFormat("es-AR");

export function NoteRow({
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
  const [value, setValue] = useState(nameEs ?? "");
  const [isSaving, startSaving] = useTransition();
  const [isClearing, startClearing] = useTransition();
  const isTranslated = nameEs !== null;
  const isPending = isSaving || isClearing;

  function save() {
    const cleanedValue = value.trim();
    if (cleanedValue.length < 2) {
      toast.error("La traducción tiene que tener al menos 2 caracteres.");
      return;
    }
    startSaving(async () => {
      const result = await translateNote(id, cleanedValue);
      if (!result.ok) {
        toast.error(result.mensaje);
        return;
      }
      toast.success(`"${nameEn}" traducida.`);
      router.refresh();
    });
  }

  function clearTranslation() {
    startClearing(async () => {
      const result = await clearNoteTranslation(id);
      if (!result.ok) {
        toast.error(result.mensaje);
        return;
      }
      setValue("");
      toast.success("Traducción borrada.");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 border-b border-border px-5 py-2.5 last:border-b-0"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{nameEn}</div>
        <div className="text-xs text-muted-foreground">
          en {numberFormatter.format(usageCount)} fragancias
        </div>
      </div>

      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Traducción al español"
        disabled={isPending}
        aria-label={`Traducción de ${nameEn}`}
        className="h-8 rounded text-sm"
      />

      <div className="flex items-center gap-1.5">
        <Button type="submit" size="sm" disabled={isPending}>
          {isTranslated ? "Actualizar" : "Guardar"}
        </Button>
        {isTranslated ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={clearTranslation}
          >
            Deshacer
          </Button>
        ) : null}
      </div>
    </form>
  );
}
