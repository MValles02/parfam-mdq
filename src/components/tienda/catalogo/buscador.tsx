"use client";

import { useEffect, useId, useState } from "react";
import { Search } from "lucide-react";
import { useQueryStates } from "nuqs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { opcionesCatalogo, parsersCatalogo } from "@/lib/tienda/filtros";

const DEBOUNCE_MS = 300;

/**
 * Buscador de texto del catalogo. El input queda controlado por estado local
 * (`valor`) y sincroniza hacia la URL con un debounce manual; no al revés,
 * porque atar el input directo al valor de la URL (que tarda uno o dos
 * renders en volver por el viaje a nuqs/router) traba al tipear.
 *
 * El `setTimeout` que empuja el cambio a la URL corre en la limpieza/callback
 * de un efecto, no en su cuerpo: eso es lo que permite el lint de React 19
 * ("nada de setState sincronico en el cuerpo de un useEffect"). El único
 * `setState` en el cuerpo del render es el de "ajustar estado cuando cambia
 * una prop" (acá, cuando `q` cambia desde afuera: recarga, back/forward o
 * "Limpiar filtros"), que es el patron que documenta React y no dispara ese
 * lint porque no vive dentro de un `useEffect`.
 */
export function Buscador({
  className,
  alto = "h-9",
}: {
  className?: string;
  /** El drawer de mobile lo quiere mas alto, para que sea tactil. */
  alto?: string;
}) {
  const [{ q }, setFiltros] = useQueryStates(parsersCatalogo, opcionesCatalogo);
  const [valor, setValor] = useState(q);
  const [ultimoQ, setUltimoQ] = useState(q);
  // Lo ultimo que escribimos nosotros en la URL. Sin esto hay una carrera al
  // tipear rapido: con `shallow: false` el `q` nuevo tarda el viaje al
  // servidor en volver, y si mientras tanto el usuario siguio escribiendo, el
  // valor que vuelve es viejo y le pisaria las teclas de mas.
  const [enviado, setEnviado] = useState(q);
  const id = useId();

  if (q !== ultimoQ) {
    setUltimoQ(q);
    // Solo se adopta el valor de la URL cuando el cambio vino de afuera:
    // recarga, back/forward o "Limpiar filtros".
    if (q !== enviado) setValor(q);
  }

  useEffect(() => {
    if (valor === q) return;
    const termino = valor.trim();
    const temporizador = setTimeout(() => {
      setEnviado(termino === "" ? "" : valor);
      setFiltros({ q: termino === "" ? null : valor, pagina: 1 });
    }, DEBOUNCE_MS);
    return () => clearTimeout(temporizador);
  }, [valor, q, setFiltros]);

  return (
    <div className={cn("relative w-full", className)}>
      <label htmlFor={id} className="sr-only">
        Buscar fragancia o marca
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Buscar fragancia o marca"
        className={cn("rounded pl-9 text-sm", alto)}
      />
    </div>
  );
}
