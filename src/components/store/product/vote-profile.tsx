import {
  DAYPART_KEYS,
  DAYPART_LABELS,
  SEASON_KEYS,
  SEASON_LABELS,
  type DaypartKey,
  type SeasonKey,
} from "@/lib/catalog";

type Seasons = Record<SeasonKey, number | null>;
type Dayparts = Record<DaypartKey, number | null>;

function PercentageBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">{value}%</span>
      </div>
      <div
        role="img"
        aria-label={`${label}: ${value}%`}
        className="h-2 w-full overflow-hidden rounded-sm bg-border"
      >
        <div
          className="h-full rounded-sm bg-primary"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Community vote percentages copied from the adopted `FragranceRef` (or set
 * directly on a manually created product). Each group hides entirely when
 * every value in it is null — a manual product with no data yet, or any
 * product whose community sample `getProductBySlug`
 * (`src/lib/store/queries.ts`) judged too small to publish. An individual
 * bar within a shown group is skipped rather than drawn empty, since a null
 * percentage is unknown, not zero.
 */
export function VoteProfile({
  seasons,
  dayparts,
}: {
  seasons: Seasons;
  dayparts: Dayparts;
}) {
  const seasonKeys = SEASON_KEYS.filter((key) => seasons[key] !== null);
  const daypartKeys = DAYPART_KEYS.filter((key) => dayparts[key] !== null);

  if (seasonKeys.length === 0 && daypartKeys.length === 0) return null;

  return (
    <section className="border-t pt-11">
      <h2 className="text-[32px] font-extrabold tracking-[-0.025em]">
        Cuándo usarlo
      </h2>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {seasonKeys.length > 0 ? (
          <div className="rounded border bg-card p-6">
            <span className="text-[11px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
              Estaciones
            </span>
            <div className="mt-5 flex flex-col gap-4">
              {seasonKeys.map((key) => (
                <PercentageBar
                  key={key}
                  label={SEASON_LABELS[key]}
                  value={seasons[key]!}
                />
              ))}
            </div>
          </div>
        ) : null}

        {daypartKeys.length > 0 ? (
          <div className="rounded border bg-card p-6">
            <span className="text-[11px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
              Momento del día
            </span>
            <div className="mt-5 flex flex-col gap-4">
              {daypartKeys.map((key) => (
                <PercentageBar
                  key={key}
                  label={DAYPART_LABELS[key]}
                  value={dayparts[key]!}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
