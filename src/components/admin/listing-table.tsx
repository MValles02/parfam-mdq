import { TableHead } from "@/components/ui/table";

/** Compact uppercase column title for the panel listing tables. */
export function ColumnHeader({ children }: { children: React.ReactNode }) {
  return (
    <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </TableHead>
  );
}
