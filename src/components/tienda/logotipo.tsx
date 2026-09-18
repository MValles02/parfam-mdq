import { cn } from "@/lib/utils";
import { siteDefaults } from "@/lib/site";

/**
 * El logotipo es tipografia, no un SVG: las piezas de Canva usan una
 * geometrica ExtraBold y el equivalente libre es Outfit, que ya es la familia
 * del sitio. Se arma con peso 800 y el
 * subtitulo en versalitas espaciadas.
 */
export function Logotipo({
  tamanio = "barra",
  etiqueta: Etiqueta = "span",
  className,
}: {
  tamanio?: "barra" | "hero" | "pie";
  /** "h1" cuando el logotipo ES el titulo de la pagina, como en el hero. */
  etiqueta?: "span" | "h1";
  className?: string;
}) {
  const medidas = {
    barra: { nombre: "text-xl", sub: "text-[7px] tracking-[0.42em]" },
    hero: {
      nombre: "text-6xl sm:text-8xl lg:text-[132px]",
      sub: "text-[11px] sm:text-[15px] lg:text-[17px] tracking-[0.5em] lg:tracking-[0.62em] mt-4 lg:mt-5",
    },
    pie: { nombre: "text-2xl", sub: "sr-only" },
  }[tamanio];

  return (
    <Etiqueta className={cn("flex flex-col items-center gap-0.5", className)}>
      <span
        className={cn(
          "leading-[0.9] font-extrabold tracking-[-0.03em]",
          medidas.nombre,
        )}
      >
        {siteDefaults.name}
      </span>
      {/* El tracking corre la ultima letra: el padding izquierdo la recentra. */}
      <span
        className={cn(
          "pl-[0.42em] font-semibold text-muted-foreground uppercase",
          medidas.sub,
        )}
      >
        Perfumeria
      </span>
    </Etiqueta>
  );
}
