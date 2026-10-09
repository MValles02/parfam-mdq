"use client";

import { Search } from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";
import { Input } from "@/components/ui/input";

/** URL-backed `q` search input shared by the panel listings. */
export function AdminSearch({ placeholder }: { placeholder: string }) {
  const [{ q }, setState] = useQueryStates(
    { q: parseAsString.withDefault("") },
    { shallow: false, throttleMs: 400, clearOnDefault: true },
  );

  return (
    <div className="relative w-70">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setState({ q: e.target.value })}
        placeholder={placeholder}
        className="h-auto rounded py-2.5 pl-8 text-sm"
      />
    </div>
  );
}
