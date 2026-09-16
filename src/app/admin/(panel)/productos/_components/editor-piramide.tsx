"use client";

import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { NotePosition } from "@/generated/prisma/enums";
import { NIVEL_PIRAMIDE, NIVELES } from "@/lib/catalogo";
import { buscarNotasAction, crearNotaAction } from "../actions";
import { ComboboxRemoto, type OpcionRemota } from "./combobox-remoto";

export type NotaElegida = {
  noteId: string;
  nombre: string;
  position: NotePosition;
};

/**
 * Pirámide olfativa en tres columnas (salida / corazón / fondo).
 *
 * A diferencia de los acordes, las notas no tienen color propio en la base:
 * el diccionario sólo le puso color a los 93 acordes. El diseño mostraba un
 * punto de color por nota, pero era decorativo — inventar un color por nota
 * sería mostrar un dato que no existe, así que van como chips planos.
 */
export function EditorPiramide({
  valor,
  onChange,
  disabled,
}: {
  valor: NotaElegida[];
  onChange: (notas: NotaElegida[]) => void;
  disabled?: boolean;
}) {
  function agregar(position: NotePosition, opcion: OpcionRemota) {
    // Una nota puede repetirse entre niveles (sale y vuelve en el fondo), pero
    // no dos veces en el mismo nivel.
    if (valor.some((n) => n.noteId === opcion.id && n.position === position)) {
      toast.info(
        `«${opcion.nombre}» ya está en ${NIVEL_PIRAMIDE[position].toLowerCase()}.`,
      );
      return;
    }
    onChange([
      ...valor,
      { noteId: opcion.id, nombre: opcion.nombre, position },
    ]);
  }

  function quitar(noteId: string, position: NotePosition) {
    onChange(
      valor.filter((n) => !(n.noteId === noteId && n.position === position)),
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {NIVELES.map((nivel) => {
        const notas = valor.filter((n) => n.position === nivel);
        return (
          <div key={nivel} className="flex flex-col gap-2">
            <span className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
              {NIVEL_PIRAMIDE[nivel]}
            </span>
            <div className="flex min-h-22 flex-wrap content-start gap-1.5 rounded-md border bg-background p-3">
              {notas.map((n) => (
                <span
                  key={`${nivel}-${n.noteId}`}
                  className="flex items-center gap-1.5 rounded-sm border bg-card py-1.5 pr-1.5 pl-2.5 text-xs font-medium"
                >
                  {n.nombre}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => quitar(n.noteId, nivel)}
                    aria-label={`Quitar ${n.nombre} de ${NIVEL_PIRAMIDE[nivel].toLowerCase()}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}

              <ComboboxRemoto
                disabled={disabled}
                placeholder="Buscar nota…"
                textoVacio="No hay ninguna nota con ese nombre."
                buscar={async (q) => {
                  const r = await buscarNotasAction(q);
                  if (!r.ok) return [];
                  return r.datos.map((n) => ({
                    id: n.id,
                    nombre: n.nombre,
                    detalle: n.traducida ? undefined : "en inglés",
                  }));
                }}
                onCrear={async (nombre) => {
                  const r = await crearNotaAction(nombre);
                  if (!r.ok) {
                    toast.error(r.mensaje);
                    return null;
                  }
                  return { id: r.datos.id, nombre: r.datos.nombre };
                }}
                onElegir={(o) => agregar(nivel, o)}
              >
                <button
                  type="button"
                  disabled={disabled}
                  className="flex items-center gap-1 rounded-sm border border-dashed px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-solid hover:text-foreground disabled:opacity-50"
                >
                  <Plus className="size-3" />
                  Agregar
                </button>
              </ComboboxRemoto>
            </div>
          </div>
        );
      })}
    </div>
  );
}
