"use client";

import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { NotePosition } from "@/generated/prisma/enums";
import {
  PYRAMID_LEVEL_LABELS as pyramidLevelLabels,
  PYRAMID_LEVELS as pyramidLevels,
} from "@/lib/catalog";
import { searchNotesAction, createNoteAction } from "../actions";
import { RemoteCombobox, type RemoteOption } from "./remote-combobox";

export type SelectedNote = {
  noteId: string;
  name: string;
  position: NotePosition;
};

/**
 * Olfactory pyramid in three columns. Notes have no source color, unlike the
 * 93 colored accords, so they are displayed as plain chips.
 */
export function PyramidEditor({
  value,
  onChange,
  disabled,
}: {
  value: SelectedNote[];
  onChange: (notes: SelectedNote[]) => void;
  disabled?: boolean;
}) {
  function addNote(position: NotePosition, option: RemoteOption) {
    // A note can recur across levels but not twice in the same level.
    if (
      value.some(
        (note) => note.noteId === option.id && note.position === position,
      )
    ) {
      toast.info(
        `«${option.label}» ya está en ${pyramidLevelLabels[position].toLowerCase()}.`,
      );
      return;
    }
    onChange([...value, { noteId: option.id, name: option.label, position }]);
  }

  function removeNote(noteId: string, position: NotePosition) {
    onChange(
      value.filter(
        (note) => !(note.noteId === noteId && note.position === position),
      ),
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {pyramidLevels.map((level) => {
        const notes = value.filter((note) => note.position === level);
        return (
          <div key={level} className="flex flex-col gap-2">
            <span className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
              {pyramidLevelLabels[level]}
            </span>
            <div className="flex min-h-22 flex-wrap content-start gap-1.5 rounded-md border bg-background p-3">
              {notes.map((note) => (
                <span
                  key={`${level}-${note.noteId}`}
                  className="flex items-center gap-1.5 rounded-sm border bg-card py-1.5 pr-1.5 pl-2.5 text-xs font-medium"
                >
                  {note.name}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeNote(note.noteId, level)}
                    aria-label={`Quitar ${note.name} de ${pyramidLevelLabels[level].toLowerCase()}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}

              <RemoteCombobox
                disabled={disabled}
                placeholder="Buscar nota…"
                emptyText="No hay ninguna nota con ese nombre."
                search={async (query) => {
                  const result = await searchNotesAction(query);
                  if (!result.ok) return [];
                  return result.datos.map((note) => ({
                    id: note.id,
                    label: note.nombre,
                    detail: note.traducida ? undefined : "en inglés",
                  }));
                }}
                onCreate={async (name) => {
                  const result = await createNoteAction(name);
                  if (!result.ok) {
                    toast.error(result.mensaje);
                    return null;
                  }
                  return { id: result.datos.id, label: result.datos.nombre };
                }}
                onSelect={(option) => addNote(level, option)}
              >
                <button
                  type="button"
                  disabled={disabled}
                  className="flex items-center gap-1 rounded-sm border border-dashed px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-solid hover:text-foreground disabled:opacity-50"
                >
                  <Plus className="size-3" />
                  Agregar
                </button>
              </RemoteCombobox>
            </div>
          </div>
        );
      })}
    </div>
  );
}
