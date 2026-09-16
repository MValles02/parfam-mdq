"use client";

import { Search } from "lucide-react";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { Input } from "@/components/ui/input";

export function BuscadorNotas() {
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
        onChange={(e) => setState({ q: e.target.value, pagina: null })}
        placeholder="Buscar nota en inglés o español"
        className="h-auto rounded py-2.5 pl-8 text-sm"
      />
    </div>
  );
}
