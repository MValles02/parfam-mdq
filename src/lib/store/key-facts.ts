import {
  LONGEVITY_LABELS,
  SEASON_KEYS,
  SEASON_LABELS,
  SILLAGE_LABELS,
  type DaypartKey,
  type SeasonKey,
} from "../catalog";

/** Community longevity decimal rounded to the nearest whole 1..5 step. */
export function roundLongevity(value: number) {
  return Math.min(Math.max(Math.round(value), 1), 5) as 1 | 2 | 3 | 4 | 5;
}

/** Community sillage decimal rounded to the nearest whole 1..4 step. */
export function roundSillage(value: number) {
  return Math.min(Math.max(Math.round(value), 1), 4) as 1 | 2 | 3 | 4;
}

export type KeyFacts = {
  duration: string | null;
  sillage: string | null;
  idealIn: string | null;
  moment: string | null;
};

/**
 * Condenses the community data into the four short captions shown above the
 * purchase controls. Longevity and sillage use the same rounding as the bars in
 * `src/components/store/product/characteristic-bars.tsx`. A null input yields a
 * null caption because null means unknown, not zero.
 */
export function summarizeKeyFacts({
  longevity,
  sillage,
  seasons,
  dayparts,
}: {
  longevity: number | null;
  sillage: number | null;
  seasons: Record<SeasonKey, number | null>;
  dayparts: Record<DaypartKey, number | null>;
}): KeyFacts {
  const topSeasons = SEASON_KEYS.flatMap((key) => {
    const value = seasons[key];
    return value ? [{ key, value }] : [];
  })
    // Array#sort is stable, so ties keep the calendar order of SEASON_KEYS.
    .sort((a, b) => b.value - a.value)
    .slice(0, 2);

  const { day, night } = dayparts;
  const moment =
    day === null && night === null
      ? null
      : (day ?? 0) === (night ?? 0)
        ? "Día y noche"
        : (day ?? 0) > (night ?? 0)
          ? "Día"
          : "Noche";

  return {
    duration:
      longevity !== null ? LONGEVITY_LABELS[roundLongevity(longevity)] : null,
    sillage: sillage !== null ? SILLAGE_LABELS[roundSillage(sillage)] : null,
    idealIn:
      topSeasons.length > 0
        ? topSeasons.map(({ key }) => SEASON_LABELS[key]).join(" · ")
        : null,
    moment,
  };
}
