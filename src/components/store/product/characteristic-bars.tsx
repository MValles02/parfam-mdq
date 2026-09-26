import { LONGEVITY_LABELS, SILLAGE_LABELS } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/**
 * Captions for the admin-entered `Product.intensity` (`prisma/schema.prisma`).
 * Unlike longevity and sillage, intensity is not community data, so it lives
 * only here rather than alongside `LONGEVITY_LABELS`/`SILLAGE_LABELS` in
 * `src/lib/catalog.ts`.
 */
const INTENSITY_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "suave",
  2: "liviana",
  3: "equilibrada",
  4: "marcada",
  5: "potente",
};

function CharacteristicBar({
  label,
  value,
  max,
  caption,
}: {
  label: string;
  value: number;
  max: number;
  caption: string;
}) {
  const steps = Array.from({ length: max }, (_, index) => index + 1);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">{caption}</span>
      </div>
      <div
        role="img"
        aria-label={`${label}: ${value} de ${max}`}
        className="flex gap-1.5"
      >
        {steps.map((step) => (
          <span
            key={step}
            className={cn(
              "h-2 flex-1 rounded-sm",
              step <= value ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Longevity, sillage, and intensity, shown together as "Carácter". Longevity
 * and sillage are community-voted, copied from the adopted `FragranceRef` (or
 * set by hand for a manually created product) and hidden by
 * `getProductBySlug` (`src/lib/store/queries.ts`) when the community sample
 * is too small; longevity is on a 1..5 scale and sillage on a 1..4 scale (see
 * prisma/schema.prisma), and both are decimals rounded to the nearest whole
 * step for the caption and the bar fill. Intensity is `Product.intensity`, an
 * admin-entered 1..5 integer that reflects ParfamMdq's own assessment rather
 * than the community, so it is never hidden by the sample-size rule above.
 */
export function CharacteristicBars({
  longevity,
  sillage,
  intensity,
}: {
  longevity: number | null;
  sillage: number | null;
  intensity: number | null;
}) {
  if (longevity === null && sillage === null && intensity === null) {
    return null;
  }

  const roundedLongevity =
    longevity !== null
      ? (Math.min(Math.max(Math.round(longevity), 1), 5) as 1 | 2 | 3 | 4 | 5)
      : null;
  const roundedSillage =
    sillage !== null
      ? (Math.min(Math.max(Math.round(sillage), 1), 4) as 1 | 2 | 3 | 4)
      : null;
  const boundedIntensity =
    intensity !== null
      ? (Math.min(Math.max(intensity, 1), 5) as 1 | 2 | 3 | 4 | 5)
      : null;

  return (
    <div className="rounded border bg-card p-[30px]">
      <h2 className="text-xl font-bold tracking-[-0.015em]">Carácter</h2>
      <div className="mt-6 flex flex-col gap-6">
        {roundedLongevity !== null ? (
          <CharacteristicBar
            label="Duración"
            value={roundedLongevity}
            max={5}
            caption={LONGEVITY_LABELS[roundedLongevity]}
          />
        ) : null}
        {roundedSillage !== null ? (
          <CharacteristicBar
            label="Estela"
            value={roundedSillage}
            max={4}
            caption={SILLAGE_LABELS[roundedSillage]}
          />
        ) : null}
        {boundedIntensity !== null ? (
          <CharacteristicBar
            label="Intensidad"
            value={boundedIntensity}
            max={5}
            caption={INTENSITY_LABELS[boundedIntensity]}
          />
        ) : null}
      </div>
      <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
        Duración y estela según los votos de la comunidad; intensidad,
        evaluación propia de ParfamMdq.
      </p>
    </div>
  );
}
