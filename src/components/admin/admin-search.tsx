"use client";

import { Search } from "lucide-react";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { Input } from "@/components/ui/input";

/**
 * URL-backed `q` input shared by panel listings. `resetPage` prevents a new
 * search from leaving the only paginated listing (`/admin/notas`) on a page
 * that no longer has results.
 *
 * The boundary key `pagina` must always be declared in `useQueryStates`.
 * Omitting it from `setState` tells nuqs to leave it unchanged. Non-paginated
 * listings never write it, so it never appears in their URLs.
 */
export function AdminSearch({
  placeholder,
  resetPage = false,
}: {
  placeholder: string;
  resetPage?: boolean;
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
            resetPage
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
