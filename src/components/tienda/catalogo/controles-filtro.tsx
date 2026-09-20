"use client";

import type { ReactNode } from "react";
import { useQueryStates } from "nuqs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { GENERO, PRESENTACION } from "@/lib/catalogo";
import {
  ETIQUETA_PRECIO,
  GENEROS,
  PRESENTACIONES,
  RANGOS_PRECIO,
  opcionesCatalogo,
  parsersCatalogo,
} from "@/lib/tienda/filtros";
import type { OpcionesDeFiltro } from "@/lib/tienda/consultas";

/**
 * Chips y selects del catalogo, compartidos entre `panel-filtros.tsx`
 * (desktop) y `drawer-filtros.tsx` (mobile). Todos leen y escriben el mismo
 * estado de URL con `useQueryStates`, así que da igual desde cuál de los dos
 * se toque un filtro.
 *
 * Radix `Select` no admite `value=""` en un item, así que las opciones
 * "Todas/Todos" usan este centinela y se traducen a `null` al escribir en
 * la URL.
 */
const TODAS = "__todas__";

function useFiltros() {
  return useQueryStates(parsersCatalogo, opcionesCatalogo);
}

function Chip({
  activo,
  tactil,
  onClick,
  children,
}: {
  activo: boolean;
  tactil?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={cn(
        "rounded border px-[18px] text-[13px] font-medium transition-colors",
        tactil ? "h-[46px]" : "h-9",
        activo
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

export function ChipsGenero({ tactil = false }: { tactil?: boolean }) {
  const [{ genero }, setFiltros] = useFiltros();

  return (
    <div className="flex flex-wrap gap-2">
      <Chip
        activo={!genero}
        tactil={tactil}
        onClick={() => setFiltros({ genero: null, pagina: 1 })}
      >
        Todos
      </Chip>
      {GENEROS.map((g) => (
        <Chip
          key={g}
          activo={genero === g}
          tactil={tactil}
          onClick={() => setFiltros({ genero: g, pagina: 1 })}
        >
          {GENERO[g]}
        </Chip>
      ))}
    </div>
  );
}

export function ChipsPresentacion({ tactil = false }: { tactil?: boolean }) {
  const [{ presentacion }, setFiltros] = useFiltros();

  return (
    <div className="flex flex-wrap gap-2">
      <Chip
        activo={!presentacion}
        tactil={tactil}
        onClick={() => setFiltros({ presentacion: null, pagina: 1 })}
      >
        Todas
      </Chip>
      {PRESENTACIONES.map((p) => (
        <Chip
          key={p}
          activo={presentacion === p}
          tactil={tactil}
          onClick={() => setFiltros({ presentacion: p, pagina: 1 })}
        >
          {PRESENTACION[p]}
        </Chip>
      ))}
    </div>
  );
}

function SelectFiltro({
  label,
  value,
  textoTodas,
  onValueChange,
  className,
  children,
}: {
  label: string;
  value: string;
  textoTodas: string;
  onValueChange: (valor: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger aria-label={label} className={className}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TODAS}>{textoTodas}</SelectItem>
        {children}
      </SelectContent>
    </Select>
  );
}

export function SelectMarca({
  opciones,
  className,
}: {
  opciones: OpcionesDeFiltro["marcas"];
  className?: string;
}) {
  const [{ marca }, setFiltros] = useFiltros();

  return (
    <SelectFiltro
      label="Marca"
      textoTodas="Todas las marcas"
      value={marca ?? TODAS}
      onValueChange={(valor) =>
        setFiltros({ marca: valor === TODAS ? null : valor, pagina: 1 })
      }
      className={className}
    >
      {opciones.map((m) => (
        <SelectItem key={m.slug} value={m.slug}>
          {m.name}
        </SelectItem>
      ))}
    </SelectFiltro>
  );
}

export function SelectFamiliaOlfativa({
  opciones,
  className,
}: {
  opciones: OpcionesDeFiltro["acordes"];
  className?: string;
}) {
  const [{ acorde }, setFiltros] = useFiltros();

  return (
    <SelectFiltro
      label="Familia olfativa"
      textoTodas="Todas las familias"
      value={acorde ?? TODAS}
      onValueChange={(valor) =>
        setFiltros({ acorde: valor === TODAS ? null : valor, pagina: 1 })
      }
      className={className}
    >
      {opciones.map((a) => (
        <SelectItem key={a.slug} value={a.slug}>
          <span className="flex items-center gap-2">
            {/* Color del acorde: es un dato de la base, no un hex de diseño. */}
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: a.color }}
            />
            {a.nombre}
          </span>
        </SelectItem>
      ))}
    </SelectFiltro>
  );
}

export function SelectNota({
  opciones,
  className,
}: {
  opciones: OpcionesDeFiltro["notas"];
  className?: string;
}) {
  const [{ nota }, setFiltros] = useFiltros();

  return (
    <SelectFiltro
      label="Nota"
      textoTodas="Todas las notas"
      value={nota ?? TODAS}
      onValueChange={(valor) =>
        setFiltros({ nota: valor === TODAS ? null : valor, pagina: 1 })
      }
      className={className}
    >
      {opciones.map((n) => (
        <SelectItem key={n.slug} value={n.slug}>
          {n.nombre}
        </SelectItem>
      ))}
    </SelectFiltro>
  );
}

export function SelectPrecio({ className }: { className?: string }) {
  const [{ precio }, setFiltros] = useFiltros();

  return (
    <SelectFiltro
      label="Precio"
      textoTodas="Todos los precios"
      value={precio ?? TODAS}
      onValueChange={(valor) =>
        setFiltros({
          precio:
            valor === TODAS ? null : (valor as (typeof RANGOS_PRECIO)[number]),
          pagina: 1,
        })
      }
      className={className}
    >
      {RANGOS_PRECIO.map((r) => (
        <SelectItem key={r} value={r}>
          {ETIQUETA_PRECIO[r]}
        </SelectItem>
      ))}
    </SelectFiltro>
  );
}

export function LimpiarFiltros({
  variante = "enlace",
  texto = "Limpiar filtros",
  className,
}: {
  variante?: "enlace" | "boton";
  texto?: string;
  className?: string;
}) {
  const [, setFiltros] = useFiltros();

  return (
    <button
      type="button"
      onClick={() => setFiltros(null)}
      className={cn(
        variante === "enlace"
          ? "text-[13px] font-medium text-muted-foreground underline underline-offset-[3px] hover:text-foreground"
          : "flex h-[54px] items-center justify-center rounded border border-border px-[22px] text-sm font-semibold text-muted-foreground hover:bg-muted",
        className,
      )}
    >
      {texto}
    </button>
  );
}
