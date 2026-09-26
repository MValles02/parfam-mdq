"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type Accord = {
  id: string;
  nameEs: string;
  nameEn: string;
  color: string;
};

export type SelectedAccord = {
  accordId: string;
  strength: number;
};

/** Strength given to an accord added by hand, matching the schema's 0..100 range. */
const DEFAULT_MANUAL_STRENGTH = 50;

function clampStrength(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 3);
  if (digits === "") return 0;
  return Math.min(100, Number(digits));
}

/**
 * All 93 accords arrive from the server, so client filtering is immediate.
 * Colors come from the product dictionary and render on public product chips.
 */
export function AccordSelector({
  accords,
  value,
  onChange,
  disabled,
}: {
  accords: Accord[];
  value: SelectedAccord[];
  onChange: (accords: SelectedAccord[]) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const accordsById = new Map(accords.map((accord) => [accord.id, accord]));
  const selectedIds = new Set(value.map((entry) => entry.accordId));
  const availableAccords = accords.filter(
    (accord) => !selectedIds.has(accord.id),
  );

  function setStrength(accordId: string, strength: number) {
    onChange(
      value.map((entry) =>
        entry.accordId === accordId ? { ...entry, strength } : entry,
      ),
    );
  }

  function removeAccord(accordId: string) {
    onChange(value.filter((entry) => entry.accordId !== accordId));
  }

  return (
    <div className="flex min-h-14 flex-wrap content-start items-center gap-1.5 rounded-md border bg-background p-3">
      {value.map((entry) => {
        const accord = accordsById.get(entry.accordId);
        if (!accord) return null;
        return (
          <span
            key={accord.id}
            className="flex items-center gap-1.5 rounded-sm border bg-card py-1.5 pr-1.5 pl-2.5 text-xs font-medium"
          >
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: accord.color }}
            />
            {accord.nameEs}
            <input
              type="number"
              min={0}
              max={100}
              disabled={disabled}
              value={entry.strength}
              aria-label={`Intensidad del acorde ${accord.nameEs}`}
              onChange={(e) =>
                setStrength(accord.id, clampStrength(e.target.value))
              }
              className="w-11 rounded-sm border bg-background px-1 py-0.5 text-center text-[11px] tabular-nums"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeAccord(accord.id)}
              aria-label={`Quitar el acorde ${accord.nameEs}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="size-3" />
            </button>
          </span>
        );
      })}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            type="button"
            disabled={disabled}
            className="flex items-center gap-1 rounded-sm border border-dashed px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-solid hover:text-foreground disabled:opacity-50"
          >
            <Plus className="size-3" />
            Agregar
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <Command>
            <CommandInput placeholder="Buscar acorde…" />
            <CommandList>
              <CommandEmpty>No hay ningún acorde con ese nombre.</CommandEmpty>
              <CommandGroup>
                {availableAccords.map((accord) => (
                  // Include the English name so cmdk can find "woody" as well
                  // as its Spanish translation.
                  <CommandItem
                    key={accord.id}
                    value={`${accord.nameEs} ${accord.nameEn}`}
                    onSelect={() => {
                      onChange([
                        ...value,
                        {
                          accordId: accord.id,
                          strength: DEFAULT_MANUAL_STRENGTH,
                        },
                      ]);
                      setIsOpen(false);
                    }}
                  >
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: accord.color }}
                    />
                    {accord.nameEs}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
