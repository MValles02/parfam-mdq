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

export type Acorde = {
  id: string;
  nameEs: string;
  nameEn: string;
  color: string;
};

/**
 * Los acordes son 93 y vienen enteros del servidor: filtrar en el cliente es
 * instantáneo y no hace falta ir a buscar nada. El color sale del diccionario
 * propio (data/dictionaries/accords.es.json) y es el chip de la ficha pública.
 */
export function SelectorAcordes({
  todos,
  valor,
  onChange,
  disabled,
}: {
  todos: Acorde[];
  valor: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const porId = new Map(todos.map((a) => [a.id, a]));
  const elegidos = valor
    .map((id) => porId.get(id))
    .filter((a) => a !== undefined);
  const disponibles = todos.filter((a) => !valor.includes(a.id));

  return (
    <div className="flex min-h-14 flex-wrap content-start items-center gap-1.5 rounded-md border bg-background p-3">
      {elegidos.map((a) => (
        <span
          key={a.id}
          className="flex items-center gap-1.5 rounded-sm border bg-card py-1.5 pr-1.5 pl-2.5 text-xs font-medium"
        >
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ background: a.color }}
          />
          {a.nameEs}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(valor.filter((id) => id !== a.id))}
            aria-label={`Quitar el acorde ${a.nameEs}`}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      <Popover open={abierto} onOpenChange={setAbierto}>
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
                {disponibles.map((a) => (
                  // El valor incluye el nombre en inglés para que el filtro de
                  // cmdk también encuentre "woody" además de "amaderado".
                  <CommandItem
                    key={a.id}
                    value={`${a.nameEs} ${a.nameEn}`}
                    onSelect={() => {
                      onChange([...valor, a.id]);
                      setAbierto(false);
                    }}
                  >
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: a.color }}
                    />
                    {a.nameEs}
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
