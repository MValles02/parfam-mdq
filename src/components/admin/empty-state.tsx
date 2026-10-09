/** Dashed placeholder shown when a panel listing has no rows. */
export function EmptyState({
  message,
  children,
}: {
  message: string;
  /** Optional call to action below the message. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded border border-dashed p-16 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {children}
    </div>
  );
}
