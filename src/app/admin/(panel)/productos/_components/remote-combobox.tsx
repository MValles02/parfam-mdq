"use client";

import { useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

export type RemoteOption = { id: string; label: string; detail?: string };

/**
 * Server-backed combobox for notes, perfumers, and brands. Loading all entries
 * would transfer about half a megabyte of JSON to choose only a few values.
 *
 * Searches run from `onValueChange` with debounce rather than `useEffect` to
 * comply with React 19's set-state-in-effect rule and retain request timing.
 */
export function RemoteCombobox({
  value,
  onSelect,
  search,
  onCreate,
  placeholder = "Buscar…",
  emptyText = "Sin resultados.",
  disabled,
  children,
  align = "start",
}: {
  value?: RemoteOption | null;
  onSelect: (option: RemoteOption) => void;
  search: (query: string) => Promise<RemoteOption[]>;
  /** Enables creating an entry that does not exist in the vocabulary. */
  onCreate?: (name: string) => Promise<RemoteOption | null>;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  /** Custom trigger; otherwise uses a button with the current value. */
  children?: React.ReactNode;
  align?: "start" | "end" | "center";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<RemoteOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Requests are numbered so stale responses cannot replace current results.
  const requestNumber = useRef(0);

  function requestOptions(nextQuery: string) {
    if (timeout.current) clearTimeout(timeout.current);
    const currentRequest = ++requestNumber.current;
    setIsLoading(true);
    timeout.current = setTimeout(async () => {
      try {
        const results = await search(nextQuery);
        if (currentRequest === requestNumber.current) setOptions(results);
      } finally {
        if (currentRequest === requestNumber.current) setIsLoading(false);
      }
    }, 200);
  }

  function handleOpenChange(nextIsOpen: boolean) {
    setIsOpen(nextIsOpen);
    // Loading defaults gives administrators useful suggestions immediately.
    if (nextIsOpen) requestOptions(query);
  }

  const alreadyExists = options.some(
    (option) => option.label.toLowerCase() === query.trim().toLowerCase(),
  );

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild disabled={disabled}>
        {children ?? (
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between bg-background font-normal"
          >
            <span className={cn(!value && "text-muted-foreground")}>
              {value?.label ?? placeholder}
            </span>
            <ChevronsUpDown className="size-3.5 opacity-50" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-[--radix-popover-trigger-width] min-w-72 p-0"
      >
        {/* The server owns filtering. A second cmdk filter could hide results
            that match through their English names. */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={(nextQuery) => {
              setQuery(nextQuery);
              requestOptions(nextQuery);
            }}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Buscando…
              </div>
            ) : (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={() => {
                    onSelect(option);
                    setIsOpen(false);
                    setQuery("");
                  }}
                >
                  <Check
                    className={cn(
                      "size-3.5",
                      value?.id === option.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex-1">{option.label}</span>
                  {option.detail ? (
                    <span className="text-xs text-muted-foreground">
                      {option.detail}
                    </span>
                  ) : null}
                </CommandItem>
              ))}

              {onCreate && query.trim().length >= 2 && !alreadyExists ? (
                <CommandItem
                  value={`crear-${query}`}
                  onSelect={async () => {
                    const created = await onCreate(query.trim());
                    if (created) onSelect(created);
                    setIsOpen(false);
                    setQuery("");
                  }}
                >
                  <Plus className="size-3.5" />
                  Crear «{query.trim()}»
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
