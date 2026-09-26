import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_COUNT = 12;

/**
 * `Suspense` fallback for the grid. It mirrors product-card.tsx's 3:4 image
 * box plus four lines of text to prevent layout shifts when data arrives.
 */
export function CatalogGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4 lg:gap-7">
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded border border-border bg-card"
        >
          <Skeleton className="aspect-[3/4] w-full rounded-none border-b border-border" />
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
