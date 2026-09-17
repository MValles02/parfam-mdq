import { Skeleton } from "@/components/ui/skeleton";

const CANTIDAD = 12;

/**
 * Fallback del `Suspense` de la grilla. Misma altura y estructura que
 * `TarjetaProductoCard` (foto 180/260px + 4 lineas) para que no salte el
 * layout cuando entran los datos.
 */
export function GrillaSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4 lg:gap-7">
      {Array.from({ length: CANTIDAD }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded border border-border bg-card"
        >
          <Skeleton className="h-[180px] w-full rounded-none border-b border-border sm:h-[260px]" />
          <div className="flex flex-1 flex-col gap-1.5 p-3.5 sm:p-[18px]">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="hidden h-3 w-1/2 sm:block" />
            <Skeleton className="mt-2 h-5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
