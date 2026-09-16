"use client";

import { useRef, useState, useTransition } from "react";
import { ExternalLink, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GENERO } from "@/lib/catalogo";
import type {
  ReferenciaAdoptable,
  ResultadoReferencia,
} from "@/lib/admin/referencias";
import { cn } from "@/lib/utils";
import { adoptarReferenciaAction, buscarReferenciasAction } from "../actions";
import { Paso } from "./campo";
import { FrascoPlaceholder } from "./frasco-placeholder";

function metaDeReferencia(r: ResultadoReferencia) {
  return [r.brandName, r.year ?? null, r.gender ? GENERO[r.gender] : null]
    .filter(Boolean)
    .join(" · ");
}

export function PasoReferencia({
  adoptada,
  onAdoptar,
  onQuitar,
  onCargaManual,
  manual,
}: {
  adoptada: { id: string; nombre: string; url: string | null } | null;
  onAdoptar: (ref: ReferenciaAdoptable) => void;
  onQuitar: () => void;
  onCargaManual: () => void;
  /** El admin ya eligió cargar a mano: el buscador queda como segunda opción. */
  manual: boolean;
}) {
  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState<ResultadoReferencia[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscado, setBuscado] = useState("");
  const [adoptando, empezarAdopcion] = useTransition();
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turno = useRef(0);

  function buscar(texto: string) {
    setConsulta(texto);
    if (temporizador.current) clearTimeout(temporizador.current);

    if (texto.trim().length < 2) {
      turno.current++;
      setResultados([]);
      setBuscando(false);
      setBuscado("");
      return;
    }

    const mio = ++turno.current;
    setBuscando(true);
    temporizador.current = setTimeout(async () => {
      const r = await buscarReferenciasAction(texto);
      if (mio !== turno.current) return;
      setBuscando(false);
      setBuscado(texto.trim());
      setResultados(r.ok ? r.datos : []);
      if (!r.ok) toast.error(r.mensaje);
    }, 250);
  }

  function adoptar(id: string) {
    empezarAdopcion(async () => {
      const r = await adoptarReferenciaAction(id);
      if (!r.ok) {
        toast.error(r.mensaje);
        return;
      }
      onAdoptar(r.datos);
      setConsulta("");
      setResultados([]);
      setBuscado("");
      toast.success(`Precargamos la ficha desde «${r.datos.name}».`);
    });
  }

  const sinResultados =
    !buscando && buscado.length > 0 && resultados.length === 0;

  return (
    <Paso
      numero={1}
      titulo="Buscar en el catálogo de referencia"
      descripcion="69.946 fragancias. Al elegir una se precargan notas, acordes, año, perfumista y género."
      acciones={
        adoptada ? (
          <Button type="button" variant="ghost" size="sm" onClick={onQuitar}>
            <X className="size-3.5" />
            Desvincular
          </Button>
        ) : null
      }
    >
      {adoptada ? (
        <div className="flex items-center gap-4 rounded-md border bg-background p-4">
          <FrascoPlaceholder className="h-11 w-8 shrink-0" />
          <div className="flex flex-1 flex-col gap-0.5">
            <p className="text-sm font-semibold">{adoptada.nombre}</p>
            <p className="text-xs text-muted-foreground">
              Ficha precargada desde el catálogo de referencia. Revisá y corregí
              lo que haga falta.
            </p>
          </div>
          {adoptada.url ? (
            <a
              href={adoptada.url}
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
              (resultados.length > 0 || sinResultados) && "rounded-b-none",
            )}
          >
            <Search className="size-4.5 shrink-0" />
            <input
              value={consulta}
              onChange={(e) => buscar(e.target.value)}
              placeholder="Escribí el nombre o la marca"
              aria-label="Buscar en el catálogo de referencia"
              className="flex-1 bg-transparent py-4 text-[15px] font-medium outline-none placeholder:text-muted-foreground/70"
            />
            {buscando || adoptando ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : resultados.length > 0 ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                {resultados.length === 12
                  ? "12+ coincidencias"
                  : `${resultados.length} ${resultados.length === 1 ? "coincidencia" : "coincidencias"}`}
              </span>
            ) : null}
          </div>

          {resultados.length > 0 ? (
            <ul className="overflow-hidden rounded-b-md border border-t-0 bg-background">
              {resultados.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    disabled={adoptando}
                    onClick={() => adoptar(r.id)}
                    className="flex w-full items-center gap-4 border-b px-4 py-3 text-left last:border-b-0 hover:bg-secondary disabled:opacity-60"
                  >
                    <FrascoPlaceholder className="h-11 w-8 shrink-0" />
                    <span className="flex flex-1 flex-col gap-0.5">
                      <span className="text-sm font-semibold">{r.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {metaDeReferencia(r)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-xs font-semibold",
                        r.hasPyramid
                          ? "text-success-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {r.hasPyramid ? "con pirámide" : "sin notas"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {sinResultados ? (
            <div className="flex items-center justify-between gap-6 rounded-b-md border border-t-0 bg-background p-5">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold">
                  No encontramos «{buscado}» en el catálogo
                </p>
                <p className="text-[13px] text-muted-foreground">
                  Buscala en Fragrantica para ver sus notas y cargala a mano acá
                  abajo.
                </p>
              </div>
              <div className="flex shrink-0 gap-2.5">
                <Button type="button" variant="outline" asChild>
                  {/* Se abre en otra pestaña: el formulario a medio llenar no
                      se pierde, que es justo el momento en que hace falta. */}
                  <a
                    href={`https://www.fragrantica.com/search/?query=${encodeURIComponent(buscado)}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Buscar en Fragrantica
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
                <Button type="button" onClick={onCargaManual}>
                  Cargar a mano
                </Button>
              </div>
            </div>
          ) : null}

          {!manual && resultados.length === 0 && !sinResultados ? (
            <p className="mt-3 text-[13px] text-muted-foreground">
              ¿No está en el catálogo?{" "}
              <button
                type="button"
                onClick={onCargaManual}
                className="font-semibold underline underline-offset-2 hover:text-foreground"
              >
                Cargalo a mano
              </button>
              .
            </p>
          ) : null}
        </div>
      )}
    </Paso>
  );
}
