"use client";

import { useRef, useState, useTransition } from "react";
import { ExternalLink, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GENDER_LABELS as genderLabels } from "@/lib/catalog";
import type {
  AdoptableReference,
  ReferenceSearchResult,
} from "@/lib/admin/references";
import { cn } from "@/lib/utils";
import { adoptReferenceAction, searchReferencesAction } from "../actions";
import { Step } from "./field";
import { BottlePlaceholder } from "@/components/bottle-placeholder";

function getReferenceMetadata(reference: ReferenceSearchResult) {
  return [
    reference.brandName,
    reference.year ?? null,
    reference.gender ? genderLabels[reference.gender] : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function ReferenceStep({
  adoptedReference,
  onAdopt,
  onUnlink,
  onManualEntry,
  isManual,
}: {
  adoptedReference: { id: string; name: string; url: string | null } | null;
  onAdopt: (reference: AdoptableReference) => void;
  onUnlink: () => void;
  onManualEntry: () => void;
  /** Manual entry was chosen, so search is secondary. */
  isManual: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReferenceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [isAdopting, startAdoption] = useTransition();
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestVersion = useRef(0);

  function search(text: string) {
    setQuery(text);
    if (timeout.current) clearTimeout(timeout.current);

    if (text.trim().length < 2) {
      requestVersion.current++;
      setResults([]);
      setIsSearching(false);
      setSearchedQuery("");
      return;
    }

    const version = ++requestVersion.current;
    setIsSearching(true);
    timeout.current = setTimeout(async () => {
      const result = await searchReferencesAction(text);
      if (version !== requestVersion.current) return;
      setIsSearching(false);
      setSearchedQuery(text.trim());
      setResults(result.ok ? result.data : []);
      if (!result.ok) toast.error(result.message);
    }, 250);
  }

  function adopt(id: string) {
    startAdoption(async () => {
      const result = await adoptReferenceAction(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      onAdopt(result.data);
      setQuery("");
      setResults([]);
      setSearchedQuery("");
      toast.success(`Precargamos la ficha desde «${result.data.name}».`);
    });
  }

  const hasNoResults =
    !isSearching && searchedQuery.length > 0 && results.length === 0;

  return (
    <Step
      number={1}
      title="Buscar en el catálogo de referencia"
      description="69.946 fragancias. Al elegir una se precargan notas, acordes, año, perfumista y género."
      actions={
        adoptedReference ? (
          <Button type="button" variant="ghost" size="sm" onClick={onUnlink}>
            <X className="size-3.5" />
            Desvincular
          </Button>
        ) : null
      }
    >
      {adoptedReference ? (
        <div className="flex items-center gap-4 rounded-md border bg-background p-4">
          <BottlePlaceholder className="h-11 w-8 shrink-0" />
          <div className="flex flex-1 flex-col gap-0.5">
            <p className="text-sm font-semibold">{adoptedReference.name}</p>
            <p className="text-xs text-muted-foreground">
              Ficha precargada desde el catálogo de referencia. Revisá y corregí
              lo que haga falta.
            </p>
          </div>
          {adoptedReference.url ? (
            <a
              href={adoptedReference.url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Ver en Fragrantica
              <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
      ) : (
        <div className="relative">
          <div
            className={cn(
              "flex items-center gap-3 rounded-md border-[1.5px] border-primary bg-background px-4",
              (results.length > 0 || hasNoResults) && "rounded-b-none",
            )}
          >
            <Search className="size-4.5 shrink-0" />
            <input
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder="Escribí el nombre o la marca"
              aria-label="Buscar en el catálogo de referencia"
              className="flex-1 bg-transparent py-4 text-[15px] font-medium outline-none placeholder:text-muted-foreground/70"
            />
            {isSearching || isAdopting ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : results.length > 0 ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                {results.length === 12
                  ? "12+ coincidencias"
                  : `${results.length} ${results.length === 1 ? "coincidencia" : "coincidencias"}`}
              </span>
            ) : null}
          </div>

          {results.length > 0 ? (
            <ul className="overflow-hidden rounded-b-md border border-t-0 bg-background">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    disabled={isAdopting}
                    onClick={() => adopt(result.id)}
                    className="flex w-full items-center gap-4 border-b px-4 py-3 text-left last:border-b-0 hover:bg-secondary disabled:opacity-60"
                  >
                    <BottlePlaceholder className="h-11 w-8 shrink-0" />
                    <span className="flex flex-1 flex-col gap-0.5">
                      <span className="text-sm font-semibold">
                        {result.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getReferenceMetadata(result)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-xs font-semibold",
                        result.hasPyramid
                          ? "text-success-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {result.hasPyramid ? "con pirámide" : "sin notas"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {hasNoResults ? (
            <div className="flex items-center justify-between gap-6 rounded-b-md border border-t-0 bg-background p-5">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold">
                  No encontramos «{searchedQuery}» en el catálogo
                </p>
                <p className="text-[13px] text-muted-foreground">
                  Buscala en Fragrantica para ver sus notas y cargala a mano acá
                  abajo.
                </p>
              </div>
              <div className="flex shrink-0 gap-2.5">
                <Button type="button" variant="outline" asChild>
                  {/* Opening a separate tab preserves partially completed form data. */}
                  <a
                    href={`https://www.fragrantica.com/search/?query=${encodeURIComponent(searchedQuery)}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Buscar en Fragrantica
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
                <Button type="button" onClick={onManualEntry}>
                  Cargar a mano
                </Button>
              </div>
            </div>
          ) : null}

          {!isManual && results.length === 0 && !hasNoResults ? (
            <p className="mt-3 text-[13px] text-muted-foreground">
              ¿No está en el catálogo?{" "}
              <button
                type="button"
                onClick={onManualEntry}
                className="font-semibold underline underline-offset-2 hover:text-foreground"
              >
                Cargalo a mano
              </button>
              .
            </p>
          ) : null}
        </div>
      )}
    </Step>
  );
}
