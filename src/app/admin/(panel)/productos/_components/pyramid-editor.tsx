"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { NotePosition } from "@/generated/prisma/enums";
import {
  PYRAMID_LEVEL_LABELS as pyramidLevelLabels,
  PYRAMID_LEVELS as pyramidLevels,
} from "@/lib/catalog";
import { searchNotesAction, createNoteAction } from "../actions";
import { parsePercentageInput } from "./percentage";
import { RemoteCombobox, type RemoteOption } from "./remote-combobox";

export type SelectedNote = {
  noteId: string;
  name: string;
  /** Null for a flat note list without top/middle/base tiers. */
  position: NotePosition | null;
  weight: number;
};

type PyramidMode = "pyramid" | "flat";

/** Notes within a tier show strongest first, matching the public product page. */
function sortByWeightDesc(notes: SelectedNote[]) {
  return [...notes].sort((a, b) => b.weight - a.weight);
}

function clampWeight(raw: string) {
  return parsePercentageInput(raw) ?? 0;
}

/**
 * Olfactory pyramid in three columns, or a flat unordered list. Notes have no
 * source color, unlike the 93 colored accords, so they are displayed as plain
 * chips with a weight input.
 */
export function PyramidEditor({
  value,
  onChange,
}: {
  value: SelectedNote[];
  onChange: (notes: SelectedNote[]) => void;
}) {
  // The schema requires every note to carry a position or none at all, so a
  // non-empty value already dictates its own mode. Recomputing it from `value`
  // on every render, instead of only once in state, keeps the editor in sync
  // when the form replaces `value` wholesale (adopting a reference, or
  // "Desvincular" followed by adopting another); otherwise a flat list could
  // render as an empty pyramid while its notes stay selected underneath. An
  // empty list has no mode of its own, so it falls back to whatever the
  // administrator last chose explicitly.
  const valueMode: PyramidMode | null =
    value.length === 0
      ? null
      : value.every((note) => note.position === null)
        ? "flat"
        : "pyramid";
  const [preferredMode, setPreferredMode] = useState<PyramidMode>(
    () => valueMode ?? "pyramid",
  );
  const mode = valueMode ?? preferredMode;

  // Remembers each note's tier from before switching to the flat list, so
  // switching back to the pyramid restores the original TOP/MIDDLE/BASE
  // distribution instead of dumping every note into TOP.
  const lastPositionRef = useRef(new Map<string, NotePosition>());

  function changeMode(nextMode: PyramidMode) {
    setPreferredMode(nextMode);
    if (nextMode === "flat") {
      for (const note of value) {
        if (note.position !== null) {
          lastPositionRef.current.set(note.noteId, note.position);
        }
      }
      onChange(value.map((note) => ({ ...note, position: null })));
    } else {
      // A note added while in flat mode has no remembered tier and starts
      // at "salida"; the administrator redistributes it to the right column.
      onChange(
        value.map((note) =>
          note.position === null
            ? {
                ...note,
                position: lastPositionRef.current.get(note.noteId) ?? "TOP",
              }
            : note,
        ),
      );
    }
  }

  function addNote(position: NotePosition | null, option: RemoteOption) {
    // A note can recur across levels but not twice in the same level.
    if (
      value.some(
        (note) => note.noteId === option.id && note.position === position,
      )
    ) {
      toast.info(
        position
          ? `«${option.label}» ya está en ${pyramidLevelLabels[position].toLowerCase()}.`
          : `«${option.label}» ya está en la lista.`,
      );
      return;
    }
    onChange([
      ...value,
      { noteId: option.id, name: option.label, position, weight: 0 },
    ]);
  }

  function removeNote(noteId: string, position: NotePosition | null) {
    onChange(
      value.filter(
        (note) => !(note.noteId === noteId && note.position === position),
      ),
    );
  }

  function setWeight(
    noteId: string,
    position: NotePosition | null,
    weight: number,
  ) {
    onChange(
      value.map((note) =>
        note.noteId === noteId && note.position === position
          ? { ...note, weight }
          : note,
      ),
    );
  }

  function renderNote(note: SelectedNote) {
    return (
      <span
        key={`${note.position ?? "flat"}-${note.noteId}`}
        className="flex items-center gap-1.5 rounded-sm border bg-card py-1.5 pr-1.5 pl-2.5 text-xs font-medium"
      >
        {note.name}
        <input
          type="number"
          min={0}
          max={100}
          value={note.weight}
          aria-label={`Intensidad de ${note.name}`}
          onChange={(e) =>
            setWeight(note.noteId, note.position, clampWeight(e.target.value))
          }
          className="w-11 rounded-sm border bg-background px-1 py-0.5 text-center text-[11px] tabular-nums"
        />
        <button
          type="button"
          onClick={() => removeNote(note.noteId, note.position)}
          aria-label={`Quitar ${note.name}`}
          className="text-muted-foreground hover:text-destructive"
        >
          <X className="size-3" />
        </button>
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup
        type="single"
        variant="outline"
        value={mode}
        onValueChange={(next) => {
          if (next) changeMode(next as PyramidMode);
        }}
        className="justify-start"
      >
        <ToggleGroupItem value="pyramid" className="px-3">
          Pirámide
        </ToggleGroupItem>
        <ToggleGroupItem value="flat" className="px-3">
          Lista sin niveles
        </ToggleGroupItem>
      </ToggleGroup>

      {mode === "pyramid" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {pyramidLevels.map((level) => {
            const notes = sortByWeightDesc(
              value.filter((note) => note.position === level),
            );
            return (
              <div key={level} className="flex flex-col gap-2">
                <span className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                  {pyramidLevelLabels[level]}
                </span>
                <div className="flex min-h-22 flex-wrap content-start gap-1.5 rounded-md border bg-background p-3">
                  {notes.map((note) => renderNote(note))}

                  <NoteSearch onSelect={(option) => addNote(level, option)} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
            Notas
          </span>
          <div className="flex min-h-22 flex-wrap content-start gap-1.5 rounded-md border bg-background p-3">
            {sortByWeightDesc(value).map((note) => renderNote(note))}

            <NoteSearch onSelect={(option) => addNote(null, option)} />
          </div>
        </div>
      )}
    </div>
  );
}

/** "Agregar" trigger that searches the note vocabulary or creates a new note. */
function NoteSearch({
  onSelect,
}: {
  onSelect: (option: RemoteOption) => void;
}) {
  return (
    <RemoteCombobox
      placeholder="Buscar nota…"
      emptyText="No hay ninguna nota con ese nombre."
      search={async (query) => {
        const result = await searchNotesAction(query);
        if (!result.ok) return [];
        return result.data.map((note) => ({
          id: note.id,
          label: note.name,
        }));
      }}
      onCreate={async (name) => {
        const result = await createNoteAction(name);
        if (!result.ok) {
          toast.error(result.message);
          return null;
        }
        return { id: result.data.id, label: result.data.name };
      }}
      onSelect={onSelect}
    >
      <button
        type="button"
        className="flex items-center gap-1 rounded-sm border border-dashed px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-solid hover:text-foreground disabled:opacity-50"
      >
        <Plus className="size-3" />
        Agregar
      </button>
    </RemoteCombobox>
  );
}
