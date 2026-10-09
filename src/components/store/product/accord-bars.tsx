import { getChipColor } from "@/lib/color";

type Accord = {
  slug: string;
  name: string;
  color: string;
  strength: number;
};

/**
 * Strength-ranked accord bars (name inside the bar, width = strength), replacing the plain chip list this section
 * used before `Product.accords` gained a `strength` (see
 * `src/lib/store/queries.ts`, ordered strongest first). The bar fill reuses
 * `getChipColor()`'s background half so the accord's own dictionary color
 * (`Accord.color`, domain data rather than a theme token) still resolves
 * through the same contrast-aware treatment.
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
