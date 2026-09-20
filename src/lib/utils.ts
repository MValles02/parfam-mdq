export { cn } from "cn";

/**
 * Cadena de foco visible para controles custom que no vienen de shadcn/ui
 * (los primitivos de `src/components/ui/` ya la traen incorporada). Mismo
 * criterio que usa `src/components/ui/input.tsx`: sin esto, un boton propio
 * cae al anillo por defecto del navegador, que no respeta `--ring`.
 */
export const FOCO_VISIBLE =
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none";
