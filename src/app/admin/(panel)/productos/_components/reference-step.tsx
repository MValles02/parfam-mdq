"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Search, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GENDER_LABELS as genderLabels } from "@/lib/catalog";
import type {
  AdoptableReference,
  ReferenceSearchResult,
} from "@/lib/admin/references";
import type { ExistingProduct } from "@/lib/admin/products";
import { cn } from "@/lib/utils";
import { adoptReferenceAction, searchReferencesAction } from "../actions";
import { getAdminProductPath } from "../paths";
import { Step } from "./step";
import { BottlePlaceholder } from "@/components/bottle-placeholder";

/** Matches `RESULT_LIMIT` in `src/lib/admin/references.ts`, which this Client
 * Component cannot import because that module loads Prisma. A full page of
 * results therefore means there may be more. */
const REFERENCE_RESULT_LIMIT = 12;

/** Queries shorter than this clear the results instead of searching. */
const MIN_QUERY_LENGTH = 2;

const SEARCH_DEBOUNCE_MS = 250;

const FRAGRANTICA_SEARCH_URL = "https://www.fragrantica.com/search/?query=";

/** The reference currently linked to the product being edited. */
export type AdoptedReference = {
  id: string;
  name: string;
  referenceUrl: string | null;
};

type ReferenceHit = ReferenceSearchResult & {
  existingProducts: ExistingProduct[];
};

const MODES = [
  ["reference", "Buscar en la referencia", "Precarga notas, acordes y perfil."],
  ["blank", "Empezar de cero", "Cargás todos los datos a mano."],
] as const;

function ExistingProductAlert({ products }: { products: ExistingProduct[] }) {
  if (products.length === 0) return null;
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-2 rounded-md border border-warning-foreground/30 bg-warning p-3 text-sm text-warning-foreground"
    >
      <TriangleAlert className="size-4 shrink-0" />
      <span>Ya lo tenés cargado como «{products[0]!.name}».</span>
      <Link
        href={getAdminProductPath(products[0]!.id)}
        className="font-semibold underline"
      >
        Abrir el existente
      </Link>
    </div>
  );
}

function getReferenceMetadata(reference: ReferenceSearchResult) {
  return [
    reference.brandName,
    reference.year,
    reference.gender ? genderLabels[reference.gender] : null,
    reference.collection,
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
  adoptedReference: AdoptedReference | null;
  onAdopt: (reference: AdoptableReference) => void;
  onUnlink: () => void;
  onManualEntry: () => void;
  /** Manual entry was chosen, so search is secondary. */
  isManual: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReferenceHit[]>([]);
  const [mode, setMode] = useState<"reference" | "blank">("reference");
  // Fetched payload awaiting confirmation: adopting prefills the whole form,
  // so the administrator reviews it first.
  const [preview, setPreview] = useState<{
    reference: AdoptableReference;
    existingProducts: ExistingProduct[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [isAdopting, startAdoption] = useTransition();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRequest = useRef(0);

  function changeQuery(text: string) {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (text.trim().length < MIN_QUERY_LENGTH) {
      latestRequest.current++;
      setResults([]);
      setIsSearching(false);
      setSearchedQuery("");
      return;
    }

    const version = ++latestRequest.current;
    setIsSearching(true);
    debounceTimer.current = setTimeout(async () => {
      const result = await searchReferencesAction(text);
      if (version !== latestRequest.current) return;
      setIsSearching(false);
      setSearchedQuery(text.trim());
      setResults(result.ok ? result.data : []);
      if (!result.ok) toast.error(result.message);
    }, SEARCH_DEBOUNCE_MS);
  }

  function select(hit: ReferenceHit) {
    startAdoption(async () => {
      const result = await adoptReferenceAction(hit.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setPreview({
        reference: result.data,
        existingProducts: hit.existingProducts,
      });
    });
  }

  function confirmPreview() {
    if (!preview) return;
    onAdopt(preview.reference);
    toast.success(`Precargamos la ficha desde «${preview.reference.name}».`);
    setPreview(null);
    setQuery("");
    setResults([]);
    setSearchedQuery("");
  }

  function startManual() {
    setMode("blank");
    setPreview(null);
    onManualEntry();
  }

  const hasNoResults =
    !isSearching && searchedQuery.length > 0 && results.length === 0;

  return (
    <Step
      number={1}
      title="Buscar en el catálogo de referencia"
      description="Más de 140.000 fragancias. Al elegir una se precargan notas, acordes y perfil."
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
          {adoptedReference.referenceUrl ? (
            <a
              href={adoptedReference.referenceUrl}
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
        <div className="flex flex-col gap-4">
          <RadioGroup
            value={mode}
            onValueChange={(value) =>
              value === "blank" ? startManual() : setMode("reference")
            }
            className="grid gap-3 sm:grid-cols-2"
            aria-label="Cómo cargar el producto"
          >
            {MODES.map(([value, title, hint]) => (
              <Label
                key={value}
                htmlFor={`mode-${value}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border bg-background p-4",
                  mode === value && "border-primary",
                )}
              >
                <RadioGroupItem value={value} id={`mode-${value}`} />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{title}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {hint}
                  </span>
                </span>
              </Label>
            ))}
          </RadioGroup>

          {mode === "reference" ? (
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
                  onChange={(e) => changeQuery(e.target.value)}
                  placeholder="Escribí el nombre o la marca"
                  aria-label="Buscar en el catálogo de referencia"
                  className="min-w-0 flex-1 bg-transparent py-4 text-[15px] font-medium outline-none placeholder:text-muted-foreground/70"
                />
                {isSearching || isAdopting ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                ) : results.length > 0 ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {results.length === REFERENCE_RESULT_LIMIT
                      ? `${REFERENCE_RESULT_LIMIT}+ coincidencias`
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
                        onClick={() => select(result)}
                        className="flex w-full items-center gap-4 border-b px-4 py-3 text-left last:border-b-0 hover:bg-secondary disabled:opacity-60"
                      >
                        <BottlePlaceholder className="h-11 w-8 shrink-0" />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-sm font-semibold">
                            {result.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {getReferenceMetadata(result)}
                          </span>
                        </span>
                        {result.existingProducts.length > 0 ? (
                          <span className="shrink-0 text-xs font-semibold text-warning-foreground">
                            Ya lo tenés
                          </span>
                        ) : null}
                        {!result.hasNotes ? (
                          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                            Sin notas
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {hasNoResults ? (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-b-md border border-t-0 bg-background p-5">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold">
                      No encontramos «{searchedQuery}» en el catálogo
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      Buscala en Fragrantica para ver sus notas y cargala a mano
                      acá abajo.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2.5">
                    <Button type="button" variant="outline" asChild>
                      {/* Opening a separate tab preserves partially completed form data. */}
                      <a
                        href={`${FRAGRANTICA_SEARCH_URL}${encodeURIComponent(searchedQuery)}`}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Buscar en Fragrantica
                        <ExternalLink className="size-3.5" />
                      </a>
                    </Button>
                    <Button type="button" onClick={startManual}>
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
                    onClick={startManual}
                    className="font-semibold underline underline-offset-2 hover:text-foreground"
                  >
                    Cargalo a mano
                  </button>
                  .
                </p>
              ) : null}

              {preview ? (
                <div className="mt-4 flex flex-col gap-3 rounded-md border bg-background p-4">
                  <ExistingProductAlert products={preview.existingProducts} />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                      {preview.reference.brand.name}
                    </p>
                    <p className="text-base font-semibold">
                      {preview.reference.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        preview.reference.year,
                        preview.reference.gender
                          ? genderLabels[preview.reference.gender]
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {preview.reference.accords.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {preview.reference.accords.map((accord) => (
                        <li
                          key={accord.accordId}
                          className="rounded border border-border bg-muted px-2 py-0.5 text-xs"
                        >
                          {accord.name}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {preview.reference.notes.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Notas:{" "}
                      {preview.reference.notes
                        .map((note) => note.name)
                        .join(", ")}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <Button type="button" onClick={confirmPreview}>
                      Usar estos datos
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setPreview(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </Step>
  );
}
