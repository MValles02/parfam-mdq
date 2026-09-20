import { cn } from "@/lib/utils";

/**
 * Etiqueta + control + error, con el estilo de label del diseño aprobado
 * (versalitas chiquitas y espaciadas).
 */
export function Campo({
  label,
  htmlFor,
  hint,
  error,
  auto,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  /** Marca el campo como precargado desde la referencia adoptada. */
  auto?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase"
        >
          {label}
        </label>
        {auto ? (
          <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-bold tracking-[0.1em] text-muted-foreground">
            AUTO
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Tarjeta numerada de cada paso del alta, como en el diseño. */
export function Paso({
  numero,
  titulo,
  descripcion,
  children,
  acciones,
}: {
  numero: number;
  titulo: string;
  descripcion?: React.ReactNode;
  children: React.ReactNode;
  acciones?: React.ReactNode;
}) {
  return (
    <section className="rounded-md border bg-card p-6">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
            {numero}
          </span>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[17px] font-bold tracking-[-0.015em]">
              {titulo}
            </h2>
            {descripcion ? (
              <p className="text-[13px] text-muted-foreground">{descripcion}</p>
            ) : null}
          </div>
        </div>
        {acciones}
      </div>
      {children}
    </section>
  );
}
