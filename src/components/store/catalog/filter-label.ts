/**
 * Small uppercase label above or beside a group of catalog filter controls.
 * It lives outside `filter-controls.tsx` because a Server Component
 * (`filter-panel.tsx`) cannot import plain values from a "use client" module.
 */
export const FILTER_LABEL_CLASS =
  "text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase";
