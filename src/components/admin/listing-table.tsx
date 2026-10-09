import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Bordered card table used by the panel listings, with a tinted header row. */
export function ListingTable({
  columns,
  children,
}: {
  /** Header cells, usually `ColumnHeader`s. */
  columns: React.ReactNode;
  /** Body rows. */
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60 hover:bg-muted/60">
            {columns}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

/** Compact uppercase column title for `ListingTable`. */
export function ColumnHeader({ children }: { children: React.ReactNode }) {
  return (
    <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </TableHead>
  );
}
