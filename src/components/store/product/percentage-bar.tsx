/**
 * Labeled horizontal bar for a 0..100 value. The fill uses the primary token
 * unless `fillColor` supplies a domain color (an accord's own color).
 */
export function PercentageBar({
  label,
  value,
  ariaLabel,
  fillColor,
}: {
  label: string;
  value: number;
  ariaLabel: string;
  fillColor?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">{value}%</span>
      </div>
      <div
        role="img"
        aria-label={ariaLabel}
        className="h-2 w-full overflow-hidden rounded-sm bg-border"
      >
        <div
          className={
            fillColor ? "h-full rounded-sm" : "h-full rounded-sm bg-primary"
          }
          style={
            fillColor
              ? { width: `${value}%`, backgroundColor: fillColor }
              : { width: `${value}%` }
          }
        />
      </div>
    </div>
  );
}
