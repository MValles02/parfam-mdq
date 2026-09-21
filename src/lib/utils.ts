export { cn } from "cn";

/**
 * Visible focus classes for custom controls outside shadcn/ui. Primitives in
 * `src/components/ui/` already include them. This matches
 * `src/components/ui/input.tsx`; without it, custom buttons fall back to the
 * browser focus ring, which does not respect `--ring`.
 */
export const FOCUS_VISIBLE =
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none";
