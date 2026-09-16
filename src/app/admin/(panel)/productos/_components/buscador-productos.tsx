"use client";

import { Search } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { Input } from "@/components/ui/input";

export function BuscadorProductos() {
  const [q, setQ] = useQueryState(
    "q",
    parseAsString
      .withDefault("")
      .withOptions({ shallow: false, throttleMs: 400, clearOnDefault: true }),
  );

  return (
    <div className="relative w-70">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar producto o marca"
        className="h-auto rounded py-2.5 pl-8 text-sm"
      />
    </div>
  );
}
