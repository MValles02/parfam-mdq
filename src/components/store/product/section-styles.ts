/**
 * Class names shared by the product detail sections. A plain module rather
 * than part of `collapsible-section.tsx`, because Server Components cannot
 * import plain values from a "use client" module.
 */

/** Full-width section heading (pyramid, when to wear it). */
export const SECTION_TITLE_CLASS =
  "text-2xl font-extrabold tracking-[-0.025em] lg:text-[32px]";

/** Boxed half-width section (technical details, character). */
export const CARD_SECTION_CLASS = "rounded border bg-card p-[30px]";

export const CARD_SECTION_TITLE_CLASS = "text-xl font-bold tracking-[-0.015em]";

/** Small uppercase label that names a group inside a section. */
export const GROUP_LABEL_CLASS =
  "text-[11px] font-bold tracking-[0.16em] text-muted-foreground uppercase";
