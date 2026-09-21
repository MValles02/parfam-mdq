/**
 * Legible colors for accord chips.
 *
 * The 93 accords each have their own database color (`Accord.color`, from
 * data/dictionaries/accords.es.json). It is the only site color that does
 * not come from a globals.css token because it is data rather than a theme
 * decision. Its foreground cannot use a token either: it must contrast with
 * that hex value, which can fall anywhere on the color ramp.
 *
 * Choosing the better palette endpoint is insufficient: 40 of the 93 colors
 * are middle tones that do not reach 4.5:1 against either endpoint (the best
 * case is 4.01), and chip text is 12 px, so WCAG AA requires 4.5:1. Adjust
 * the background just enough away from the foreground to reach that threshold.
 * The maximum adjustment in the current dictionary is 8% toward the opposite
 * endpoint, preserving the accord's recognizable hue.
 */

const INK = "#14120F";
const CREAM = "#F2EEE9";

/** WCAG AA for normal text. The 12 px chip text does not qualify as large. */
const MINIMUM_CONTRAST = 4.5;

/** The amount each iteration moves the background toward the other endpoint. */
const STEP = 0.02;

type Rgb = [number, number, number];

function toRgb(hex: string): Rgb | null {
  const normalizedHex = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalizedHex)) return null;
  return [0, 2, 4].map((index) =>
    Number.parseInt(normalizedHex.slice(index, index + 2), 16),
  ) as Rgb;
}

function toHex(rgb: Rgb): string {
  return `#${rgb
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Converts a color channel to linear light as WCAG defines relative luminance. */
function toLinearLight(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function getLuminance([red, green, blue]: Rgb): number {
  return (
    0.2126 * toLinearLight(red / 255) +
    0.7152 * toLinearLight(green / 255) +
    0.0722 * toLinearLight(blue / 255)
  );
}

/** WCAG contrast ratio between two colors, from 1 to 21. */
function getContrastRatio(first: Rgb, second: Rgb): number {
  const firstLuminance = getLuminance(first);
  const secondLuminance = getLuminance(second);
  const [higher, lower] =
    firstLuminance > secondLuminance
      ? [firstLuminance, secondLuminance]
      : [secondLuminance, firstLuminance];
  return (higher + 0.05) / (lower + 0.05);
}

function blend(from: Rgb, to: Rgb, ratio: number): Rgb {
  return from.map((value, index) => value + (to[index] - value) * ratio) as Rgb;
}

export type ChipColor = { background: string; foreground: string };

/**
 * Returns an accord chip's background and foreground while guaranteeing 4.5:1.
 * Invalid hex colors fall back to neutral tokens because an uncolored chip is
 * better than an illegible one.
 */
export function getChipColor(color: string): ChipColor {
  const base = toRgb(color);
  if (!base) return { background: CREAM, foreground: INK };

  const ink = toRgb(INK)!;
  const cream = toRgb(CREAM)!;

  // Start from the endpoint that already has the better contrast so the later
  // adjustment is as small as possible.
  const usesInk = getContrastRatio(base, ink) >= getContrastRatio(base, cream);
  const foreground = usesInk ? ink : cream;
  const opposite = usesInk ? cream : ink;

  if (getContrastRatio(base, foreground) >= MINIMUM_CONTRAST) {
    return { background: toHex(base), foreground: toHex(foreground) };
  }

  for (let ratio = STEP; ratio <= 1; ratio += STEP) {
    const candidate = blend(base, opposite, ratio);
    if (getContrastRatio(candidate, foreground) >= MINIMUM_CONTRAST) {
      return { background: toHex(candidate), foreground: toHex(foreground) };
    }
  }
  return { background: toHex(opposite), foreground: toHex(foreground) };
}
