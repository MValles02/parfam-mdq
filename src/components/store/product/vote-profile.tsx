import {
  DAYPART_KEYS,
  DAYPART_LABELS,
  SEASON_KEYS,
  SEASON_LABELS,
  type DaypartKey,
  type SeasonKey,
} from "@/lib/catalog";
import { CollapsibleSection } from "./collapsible-section";
import { PercentageBar } from "./percentage-bar";
import { GROUP_LABEL_CLASS, SECTION_TITLE_CLASS } from "./section-styles";

type Seasons = Record<SeasonKey, number | null>;
type Dayparts = Record<DaypartKey, number | null>;

function knownKeys<K extends string>(
  keys: readonly K[],
  values: Record<K, number | null>,
): K[] {
  return keys.filter((key) => values[key] !== null);
}

/** One box of percentage bars for the keys that have a value. */
function VoteGroup<K extends string>({
  title,
  keys,
  labels,
  values,
}: {
  title: string;
  keys: K[];
  labels: Record<K, string>;
  values: Record<K, number | null>;
}) {
  return (
    <div className="rounded border bg-card p-6">
      <span className={GROUP_LABEL_CLASS}>{title}</span>
      <div className="mt-5 flex flex-col gap-4">
        {keys.map((key) => (
          <PercentageBar
            key={key}
            label={labels[key]}
            value={values[key]!}
            ariaLabel={`${labels[key]}: ${values[key]}%`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Community vote percentages copied from the adopted `FragranceRef` (or set
 * directly on a manually created product). Each group hides entirely when
 * every value in it is null — a manual product with no data yet, or any
 * product whose community sample `getProductBySlug`
 * (`src/lib/store/product-detail.ts`) judged too small to publish. An
 * individual bar within a shown group is skipped rather than drawn empty,
 * since a null percentage is unknown, not zero.
 */
export function VoteProfile({
  seasons,
  dayparts,
}: {
  seasons: Seasons;
  dayparts: Dayparts;
}) {
  const seasonKeys = knownKeys(SEASON_KEYS, seasons);
  const daypartKeys = knownKeys(DAYPART_KEYS, dayparts);

  if (seasonKeys.length === 0 && daypartKeys.length === 0) return null;

  return (
    <CollapsibleSection
      defaultOpenOnMobile
      className="border-t pt-11"
      title={<h2 className={SECTION_TITLE_CLASS}>Cuándo usarlo</h2>}
    >
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {seasonKeys.length > 0 ? (
          <VoteGroup
            title="Estaciones"
            keys={seasonKeys}
            labels={SEASON_LABELS}
            values={seasons}
          />
        ) : null}

        {daypartKeys.length > 0 ? (
          <VoteGroup
            title="Momento del día"
            keys={daypartKeys}
            labels={DAYPART_LABELS}
            values={dayparts}
          />
        ) : null}
      </div>
    </CollapsibleSection>
  );
}
