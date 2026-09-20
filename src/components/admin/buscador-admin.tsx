"use client";

import { Search } from "lucide-react";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { Input } from "@/components/ui/input";

/**
 * Input de busqueda por `q` en la URL, compartido por los listados del panel
 * (marcas, pedidos, productos, notas). `resetPagina` es para la unica lista
 * que pagina hoy (/admin/notas): sin resetear, tipear una busqueda nueva
 * podria dejar al usuario en una pagina que ya no tiene resultados.
 *
 * Siempre se declara `pagina` en `useQueryStates` (aunque la lista no
 * pagine): omitir la clave al llamar `setState` es la forma en que nuqs
 * entiende "no tocar este parametro" (`Partial<Nullable<Values<T>>>`, ver
 * node_modules/nuqs/dist/index.d.ts). Las listas sin paginacion nunca
 * escriben ahi, asi que el parametro nunca aparece en su URL.
 */
export function BuscadorAdmin({
  placeholder,
  resetPagina = false,
}: {
  placeholder: string;
  resetPagina?: boolean;
}) {
  const [{ q }, setState] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
      pagina: parseAsInteger.withDefault(1),
    },
    { shallow: false, throttleMs: 400, clearOnDefault: true },
  );

  return (
    <div className="relative w-70">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) =>
          setState(
            resetPagina
              ? { q: e.target.value, pagina: null }
              : { q: e.target.value },
          )
        }
        placeholder={placeholder}
        className="h-auto rounded py-2.5 pl-8 text-sm"
      />
    </div>
  );
}
