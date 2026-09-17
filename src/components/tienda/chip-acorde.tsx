import { colorDeChip } from "@/lib/color";
import { cn } from "@/lib/utils";

/**
 * Chip de acorde con su color real del diccionario. Es la unica excepcion
 * legitima a "todo sale de un token" (ver AGENTS.md): el color es un dato de
 * la base, asi que va inline. `colorDeChip` se encarga de que el texto se lea
 * -- elige tinta o crema y, si hace falta, corrige el fondo lo justo para
 * llegar a 4,5:1.
 */
export function ChipAcorde({
  nombre,
  color,
  className,
}: {
  nombre: string;
  color: string;
  className?: string;
}) {
  const { fondo, texto } = colorDeChip(color);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-3 py-1.5 text-xs font-semibold",
        className,
      )}
      style={{ backgroundColor: fondo, color: texto }}
    >
      {nombre}
    </span>
  );
}
