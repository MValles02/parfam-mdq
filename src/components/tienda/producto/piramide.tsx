import type { NotePosition } from "@/generated/prisma/enums";
import { NIVEL_PIRAMIDE } from "@/lib/catalogo";

type Nivel = {
  nivel: NotePosition;
  notas: { slug: string; nombre: string }[];
};

/**
 * Cuando se siente cada nivel de la piramide. No sale de ningun lado del
 * diccionario, es texto propio de la ficha.
 */
const CUANDO: Record<NotePosition, string> = {
  TOP: "primeros minutos",
  MIDDLE: "1 a 3 horas",
  BASE: "el resto del día",
};

/**
 * Piramide olfativa (design/Producto.dc.html). Las notas van sin punto de
 * color: el diccionario (data/dictionaries/accords.es.json) solo le puso color
 * a los acordes, asi que inventarle uno a cada nota mostraria un dato que no
 * existe.
 *
 * El 33% del dataset no trae piramide (`productoPorSlug` ya filtra los
 * niveles sin notas): si queda vacia, no se renderiza la seccion.
 */
export function Piramide({ piramide }: { piramide: Nivel[] }) {
  if (piramide.length === 0) return null;

  return (
    <section className="border-t pt-11">
      <h2 className="text-[32px] font-extrabold tracking-[-0.025em]">
        Pirámide olfativa
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Cómo evoluciona la fragancia en la piel, de las primeras notas al fondo.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {piramide.map((nivel) => (
          <div key={nivel.nivel} className="rounded border bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                {NIVEL_PIRAMIDE[nivel.nivel]}
              </span>
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] text-muted-foreground">
                {CUANDO[nivel.nivel]}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {nivel.notas.map((nota) => (
                <span
                  key={nota.slug}
                  className="rounded border bg-background px-3 py-2 text-[13px]"
                >
                  {nota.nombre}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
