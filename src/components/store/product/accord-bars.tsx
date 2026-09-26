import { getChipColor } from "@/lib/color";

type Accord = {
  slug: string;
  name: string;
  color: string;
  strength: number;
};

/**
 * Strength-ranked accord bars, replacing the plain chip list this section
 * used before `Product.accords` gained a `strength` (see
 * `src/lib/store/queries.ts`, ordered strongest first). The bar fill reuses
 * `getChipColor()`'s background half so the accord's own dictionary color
 * (`Accord.color`, domain data rather than a theme token) still resolves
 * through the same contrast-aware treatment.
 */
export function AccordBars({ accords }: { accords: Accord[] }) {
  if (accords.length === 0) return null;

  return (
    <div className="mt-6 flex flex-col gap-3">
      {accords.map((accord) => {
        const { background } = getChipColor(accord.color);
        return (
          <div key={accord.slug} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">{accord.name}</span>
              <span className="text-xs text-muted-foreground">
                {accord.strength}%
              </span>
            </div>
            <div
              role="img"
              aria-label={`${accord.name}: ${accord.strength} de 100`}
              className="h-2 w-full overflow-hidden rounded-sm bg-border"
            >
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${accord.strength}%`,
                  backgroundColor: background,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
