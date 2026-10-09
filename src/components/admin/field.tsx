/**
 * Label, control, and error with the approved compact uppercase label style.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  isAutofilled,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  /** Shows that the field was prefilled from the adopted reference. */
  isAutofilled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase"
        >
          {label}
        </label>
        {isAutofilled ? (
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
