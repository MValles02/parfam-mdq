import { cn } from "@/lib/utils";

const STEPS = [1, 2, 3, 4, 5];

const LONGEVITY_CAPTIONS = ["corta", "moderada", "buena", "larga", "eterna"];
const SILLAGE_CAPTIONS = ["íntima", "cercana", "moderada", "fuerte", "enorme"];
const INTENSITY_CAPTIONS = [
  "suave",
  "liviana",
  "equilibrada",
  "marcada",
  "potente",
];

function CharacteristicBar({
  label,
  value,
  captions,
}: {
  label: string;
  value: number;
  captions: string[];
}) {
  const boundedValue = Math.min(Math.max(value, 1), 5);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">
          {captions[boundedValue - 1]}
        </span>
      </div>
      <div
        role="img"
        aria-label={`${label}: ${boundedValue} de 5`}
        className="flex gap-1.5"
      >
        {STEPS.map((step) => (
          <span
            key={step}
            className={cn(
              "h-2 flex-1 rounded-sm",
              step <= boundedValue ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Admin-entered longevity, sillage, and intensity values based on product
 * experience rather than community ratings.
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

  return (
    <div className="rounded border bg-card p-[30px]">
      <h2 className="text-xl font-bold tracking-[-0.015em]">Carácter</h2>
      <div className="mt-6 flex flex-col gap-6">
        {longevity !== null ? (
          <CharacteristicBar
            label="Duración"
            value={longevity}
            captions={LONGEVITY_CAPTIONS}
          />
        ) : null}
        {sillage !== null ? (
          <CharacteristicBar
            label="Estela"
            value={sillage}
            captions={SILLAGE_CAPTIONS}
          />
        ) : null}
        {intensity !== null ? (
          <CharacteristicBar
            label="Intensidad"
            value={intensity}
            captions={INTENSITY_CAPTIONS}
          />
        ) : null}
      </div>
      <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
        Valores cargados por ParfamMdq a partir de la experiencia con el
        producto.
      </p>
    </div>
  );
}
