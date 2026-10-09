import { getChipColor } from "@/lib/color";

type Accord = {
  slug: string;
  name: string;
  color: string;
  strength: number;
};

/**
 * Accord bars by `ProductAccord.strength` (name inside the bar, width =
 * strength), in the strongest-first order `getProductBySlug`
 * (`src/lib/store/product-detail.ts`) returns. The bar fill reuses
 * `getChipColor()`'s background half so the accord's own dictionary color
 * (`Accord.color`, domain data rather than a theme token) resolves through
 * the same contrast-aware treatment as accord chips.
 */
export function AccordBars({ accords }: { accords: Accord[] }) {
  if (accords.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {accords.map((accord) => {
        const { background, foreground } = getChipColor(accord.color);
        return (
          <div
            key={accord.slug}
            role="img"
            aria-label={`${accord.name}: ${accord.strength} de 100`}
            className="flex h-9 items-center overflow-hidden rounded-sm bg-muted"
          >
            {/* The label sits inside the fill; min-w-fit keeps short bars legible. */}
            <div
              className="flex h-full min-w-fit items-center rounded-sm px-3 text-sm font-semibold whitespace-nowrap"
              style={{
                width: `${accord.strength}%`,
                backgroundColor: background,
                color: foreground,
              }}
            >
              {accord.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
