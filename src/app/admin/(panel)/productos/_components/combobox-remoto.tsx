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

export type OpcionRemota = { id: string; nombre: string; detalle?: string };

/**
 * Combobox con búsqueda contra el servidor. Lo usan los autocompletados de
 * notas (1.882), perfumistas (1.355) y marcas (1.748): traerlos enteros al
 * cliente sería medio megabyte de JSON para elegir tres.
 *
 * La búsqueda se dispara desde `onValueChange` con un debounce, no desde un
 * `useEffect`: la regla `react-hooks/set-state-in-effect` de React 19 prohíbe
 * setear estado dentro de un efecto, y además así no se pierde el control de
 * cuándo se consulta.
 */
export function ComboboxRemoto({
  valor,
  onElegir,
  buscar,
  onCrear,
  placeholder = "Buscar…",
  textoVacio = "Sin resultados.",
  disabled,
  children,
  align = "start",
}: {
  valor?: OpcionRemota | null;
  onElegir: (opcion: OpcionRemota) => void;
  buscar: (query: string) => Promise<OpcionRemota[]>;
  /** Si está, el combobox ofrece crear lo que no existe en el vocabulario. */
  onCrear?: (nombre: string) => Promise<OpcionRemota | null>;
  placeholder?: string;
  textoVacio?: string;
  disabled?: boolean;
  /** Disparador a medida; si no viene, se usa un botón con el valor actual. */
  children?: React.ReactNode;
  align?: "start" | "end" | "center";
}) {
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [opciones, setOpciones] = useState<OpcionRemota[]>([]);
  const [cargando, setCargando] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cada búsqueda lleva número: si vuelve una vieja después de una nueva, se
  // descarta en vez de pisar los resultados buenos.
  const turno = useRef(0);

  function pedir(query: string) {
    if (temporizador.current) clearTimeout(temporizador.current);
    const mio = ++turno.current;
    setCargando(true);
    temporizador.current = setTimeout(async () => {
      try {
        const resultado = await buscar(query);
        if (mio === turno.current) setOpciones(resultado);
      } finally {
        if (mio === turno.current) setCargando(false);
      }
    }, 200);
  }

  function alAbrir(siguiente: boolean) {
    setAbierto(siguiente);
    // Al abrir se muestran las sugerencias por default (las más usadas),
    // así el admin no arranca frente a una lista vacía.
    if (siguiente) pedir(consulta);
  }

  const yaEsta = opciones.some(
    (o) => o.nombre.toLowerCase() === consulta.trim().toLowerCase(),
  );

  return (
    <Popover open={abierto} onOpenChange={alAbrir}>
      <PopoverTrigger asChild disabled={disabled}>
        {children ?? (
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={abierto}
            className="w-full justify-between bg-background font-normal"
          >
            <span className={cn(!valor && "text-muted-foreground")}>
              {valor?.nombre ?? placeholder}
            </span>
            <ChevronsUpDown className="size-3.5 opacity-50" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-[--radix-popover-trigger-width] min-w-72 p-0"
      >
        {/* shouldFilter=false porque filtra el servidor; si filtrara también
            cmdk, escondería resultados que sí coinciden por el nombre en inglés. */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={consulta}
            onValueChange={(v) => {
              setConsulta(v);
              pedir(v);
            }}
          />
          <CommandList>
            {cargando ? (
              <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Buscando…
              </div>
            ) : (
              <CommandEmpty>{textoVacio}</CommandEmpty>
            )}
            <CommandGroup>
              {opciones.map((o) => (
                <CommandItem
                  key={o.id}
                  value={o.id}
                  onSelect={() => {
                    onElegir(o);
                    setAbierto(false);
                    setConsulta("");
                  }}
                >
                  <Check
                    className={cn(
                      "size-3.5",
                      valor?.id === o.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex-1">{o.nombre}</span>
                  {o.detalle ? (
                    <span className="text-xs text-muted-foreground">
                      {o.detalle}
                    </span>
                  ) : null}
                </CommandItem>
              ))}

              {onCrear && consulta.trim().length >= 2 && !yaEsta ? (
                <CommandItem
                  value={`crear-${consulta}`}
                  onSelect={async () => {
                    const creada = await onCrear(consulta.trim());
                    if (creada) onElegir(creada);
                    setAbierto(false);
                    setConsulta("");
                  }}
                >
                  <Plus className="size-3.5" />
                  Crear «{consulta.trim()}»
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
