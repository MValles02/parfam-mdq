import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  serializeCatalogFilters,
  type CatalogFilters,
} from "@/lib/store/filters";
import { listCatalogCached } from "./grid";

/**
 * Builds a page URL from current filters. The shared serializer keeps Spanish
 * query keys and URL values stable while application state stays in English.
 */
function getPageHref(filters: CatalogFilters, page: number): string {
  // Page 1 with no other filters serializes to "", and `href=""` resolves to
  // the current URL (stuck on the current page); "?" clears the query instead.
  return serializeCatalogFilters({ ...filters, page }) || "?";
}

/** Returns page numbers with ellipses where the range is discontinuous. */
function getVisiblePages(current: number, total: number): (number | "...")[] {
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  const pages: (number | "...")[] = [1];
  if (start > 2) pages.push("...");
  for (let page = start; page <= end; page++) pages.push(page);
  if (end < total - 1) pages.push("...");
  if (total > 1) pages.push(total);
  return pages;
}

/**
 * Server-rendered catalog pagination links share the same cached result query
 * as CatalogGrid.
 */
export async function CatalogPagination({
  filters,
}: {
  filters: CatalogFilters;
}) {
  const { page: currentPage, pages: totalPages } =
    await listCatalogCached(filters);
  if (totalPages <= 1) return null;

  const href = (page: number) => getPageHref(filters, page);
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <Pagination className="mt-10">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            text="Anterior"
            href={href(Math.max(1, currentPage - 1))}
            aria-disabled={isFirstPage}
            tabIndex={isFirstPage ? -1 : undefined}
            className={
              isFirstPage ? "pointer-events-none opacity-50" : undefined
            }
          />
        </PaginationItem>

        {getVisiblePages(currentPage, totalPages).map((page, index) =>
          page === "..." ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink href={href(page)} isActive={page === currentPage}>
                {page}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            text="Siguiente"
            href={href(Math.min(totalPages, currentPage + 1))}
            aria-disabled={isLastPage}
            tabIndex={isLastPage ? -1 : undefined}
            className={
              isLastPage ? "pointer-events-none opacity-50" : undefined
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
