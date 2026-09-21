import { getChipColor } from "@/lib/color";
import { cn } from "@/lib/utils";

/**
 * Accord chip using the dictionary color. This is the one valid exception to
 * token-only colors: the color is database data, so it is inline.
 * `getChipColor` selects legible foreground and background colors.
 */
export function AccordChip({
  name,
  color,
  className,
}: {
  name: string;
  color: string;
  className?: string;
}) {
  const { background, foreground } = getChipColor(color);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-3 py-1.5 text-xs font-semibold",
        className,
      )}
      style={{ backgroundColor: background, color: foreground }}
    >
      {name}
    </span>
  );
}
