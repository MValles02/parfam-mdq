import Link from "next/link";
import { PRESENTATIONS } from "@/lib/store/presentations";

/**
 * Flat ledger strip that explains the three presentations. It is rendered
 * twice on the home page (mobile inside the grid, desktop above the catalog),
 * each copy hidden by CSS on the other breakpoint, so it uses a plain label
 * instead of a heading to keep the heading order h1 > h2 > h3 intact.
 */
export function PresentationsStrip({ className }: { className?: string }) {
  return (
    <aside aria-label="Presentaciones" className={className}>
      <dl className="border-y border-border">
        {PRESENTATIONS.map((item) => (
          <div
            key={item.name}
            className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0 lg:flex-row lg:items-baseline lg:gap-6"
          >
            <dt className="text-[11px] font-bold tracking-[0.16em] text-foreground uppercase lg:w-24 lg:shrink-0">
              {item.name}
            </dt>
            <dd className="text-xs text-muted-foreground lg:text-[13px]">
              {item.description}
            </dd>
          </div>
        ))}
      </dl>
      <Link
        href="/presentaciones"
        className="inline-flex min-h-11 items-center text-[13px] font-medium underline underline-offset-[3px] hover:text-muted-foreground"
      >
        ¿Frasco, tester o decant? Te explicamos
      </Link>
    </aside>
  );
}
