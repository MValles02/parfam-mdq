import { cn } from "@/lib/utils";

const PASOS = [1, 2, 3, 4, 5];

const CAPTIONS_DURACION = ["corta", "moderada", "buena", "larga", "eterna"];
const CAPTIONS_ESTELA = ["íntima", "cercana", "moderada", "fuerte", "enorme"];
const CAPTIONS_INTENSIDAD = [
  "suave",
  "liviana",
  "equilibrada",
  "marcada",
  "potente",
];

function Barra({
  label,
  valor,
  captions,
}: {
  label: string;
  valor: number;
  captions: string[];
}) {
  const acotado = Math.min(Math.max(valor, 1), 5);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">
          {captions[acotado - 1]}
        </span>
      </div>
      <div
        role="img"
        aria-label={`${label}: ${acotado} de 5`}
        className="flex gap-1.5"
      >
        {PASOS.map((paso) => (
          <span
            key={paso}
            className={cn(
              "h-2 flex-1 rounded-[2px]",
              paso <= acotado ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Carácter: duracion, estela e intensidad, tres datos que carga el admin a
 * partir de haber probado el producto -- por eso el pie deja explicito que no
 * son votos de la comunidad (AGENTS.md: nada de ratings de Fragrantica en
 * publico).
 */
export function BarrasCaracter({
  duracion,
  estela,
  intensidad,
}: {
  duracion: number | null;
  estela: number | null;
  intensidad: number | null;
}) {
  if (duracion === null && estela === null && intensidad === null) {
    return null;
  }

  return (
    <div className="rounded border bg-card p-[30px]">
      <h2 className="text-xl font-bold tracking-[-0.015em]">Carácter</h2>
      <div className="mt-6 flex flex-col gap-6">
        {duracion !== null ? (
          <Barra
            label="Duración"
            valor={duracion}
            captions={CAPTIONS_DURACION}
          />
        ) : null}
        {estela !== null ? (
          <Barra label="Estela" valor={estela} captions={CAPTIONS_ESTELA} />
        ) : null}
        {intensidad !== null ? (
          <Barra
            label="Intensidad"
            valor={intensidad}
            captions={CAPTIONS_INTENSIDAD}
          />
        ) : null}
      </div>
      <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
        Valores cargados por ParfamMdq a partir de la experiencia con el
        producto.
      </p>
    </div>
  );
}
