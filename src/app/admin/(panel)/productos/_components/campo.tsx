export { Campo } from "@/components/admin/campo";

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
