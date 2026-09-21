export { Field as Field } from "@/components/admin/field";

/** Numbered card for each creation step. */
export function Step({
  number,
  title,
  description,
  children,
  actions,
}: {
  number: number;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="rounded-md border bg-card p-6">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
            {number}
          </span>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[17px] font-bold tracking-[-0.015em]">
              {title}
            </h2>
            {description ? (
              <p className="text-[13px] text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
