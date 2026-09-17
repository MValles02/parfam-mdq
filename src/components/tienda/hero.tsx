import { ChevronDown } from "lucide-react";
import { Logotipo } from "@/components/tienda/logotipo";
import { obtenerConfiguracionSitio } from "@/lib/configuracion";

/**
 * Hero de la home (design/Main.dc.html, bloque "Hero"; version mobile en
 * design/HomeMobile.dc.html). Todo centrado, con el link ancla que baja al
 * catalogo.
 *
 * El logotipo (el nombre de marca) sigue siendo tipografia fija -- la
 * identidad visual es a proposito asi, ver "Identidad visual" en PLAN.md --
 * pero el tagline es editable desde `/admin/configuracion` a partir de la
 * Fase 6, asi que sale de `SiteSetting.brandTagline`.
 *
 * El logotipo es el <h1> de la home: es lo que la pagina dice que es. Por eso
 * la seccion de catalogo de abajo entra en h2 (ver `nivelTitulo`).
 */
export async function Hero() {
  const config = await obtenerConfiguracionSitio();

  return (
    <div className="relative flex h-[520px] flex-col items-center justify-center px-5 text-center lg:h-[720px]">
      <Logotipo tamanio="hero" etiqueta="h1" />

      <div className="my-8 h-px w-9 bg-foreground lg:my-11 lg:w-12" />

      <p className="max-w-[90vw] text-[17px] font-light text-muted-foreground italic lg:text-[21px]">
        &ldquo;{config.brandTagline}&rdquo;
      </p>

      <a
        href="#catalogo"
        className="absolute bottom-9 flex flex-col items-center gap-2.5 text-[9px] font-bold tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground lg:bottom-11 lg:text-[10px] lg:tracking-[0.34em]"
      >
        VER CATÁLOGO
        <ChevronDown className="size-4 lg:size-[18px]" />
      </a>
    </div>
  );
}
