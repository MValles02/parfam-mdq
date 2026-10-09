import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";
import { GuideShell } from "@/components/store/guide-nav";
import { PageCtaPair } from "@/components/store/page-cta-pair";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSiteSettings } from "@/lib/settings";

const PAGE_TITLE = "Concentraciones";
const PAGE_PATH = "/concentraciones";

export const metadata: Metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description:
    "EDT, EDP, Parfum: qué indica cada sigla, cuánto dura aproximadamente y para qué ocasión conviene cada concentración.",
  path: PAGE_PATH,
});

// Bar widths are literal classes so Tailwind can see them at build time.
const LEVELS = [
  {
    name: "Eau Fraîche",
    essence: "1–3 %",
    duration: "1–2 h",
    ideal: "Después de la ducha o en días de calor",
    bar: "w-[12%]",
  },
  {
    name: "Eau de Cologne",
    essence: "2–5 %",
    duration: "Unas 2 h",
    ideal: "Calor, deporte",
    bar: "w-[20%]",
  },
  {
    name: "Eau de Toilette",
    essence: "5–15 %",
    duration: "3–5 h",
    ideal: "Uso diario",
    bar: "w-[45%]",
  },
  {
    name: "Eau de Parfum",
    essence: "15–20 %",
    duration: "6–8 h",
    ideal: "Todo el día, salidas",
    bar: "w-[72%]",
  },
  {
    name: "Parfum / Extrait de Parfum",
    essence: "20–30 % o más",
    duration: "8 h o más",
    ideal: "Noches, eventos",
    bar: "w-full",
  },
];

const NOTES = [
  {
    title: "¿Y Elixir, Intense o Absolu?",
    body: "No son una categoría oficial. Cada marca usa esos nombres para una versión más concentrada o más densa de su perfume, y la cifra exacta depende de la marca.",
  },
  {
    title: "Dura más no es lo mismo que se siente más",
    body: "Un Parfum suele quedarse más pegado a la piel. Para saber cuánto se proyecta, mirá “Duración” y “Estela” en la página de cada producto.",
  },
];

export default async function ConcentracionesPage() {
  const config = await getSiteSettings();

  return (
    <GuideShell current={PAGE_PATH} title={PAGE_TITLE}>
      <article>
        <h1 className="text-4xl font-extrabold tracking-[-0.03em] lg:text-6xl">
          EDT, EDP, Parfum: ¿qué cambia?
        </h1>

        <p className="mt-8 text-lg leading-relaxed">
          La sigla indica cuánta esencia tiene el perfume. En general, más
          esencia = dura más en la piel.
        </p>

        <h2 className="mt-12 text-lg font-bold">De más suave a más intenso</h2>
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Concentración</TableHead>
              <TableHead>% esencia aprox.</TableHead>
              <TableHead>Duración aprox.</TableHead>
              <TableHead>Ideal para</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {LEVELS.map((level) => (
              <TableRow key={level.name}>
                <TableCell className="min-w-40 font-bold whitespace-normal">
                  {level.name}
                  <div
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-full rounded-full bg-secondary"
                  >
                    <div
                      className={`h-full rounded-full bg-primary ${level.bar}`}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {level.essence}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {level.duration}
                </TableCell>
                <TableCell className="min-w-40 whitespace-normal text-muted-foreground">
                  {level.ideal}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="mt-3 text-sm text-muted-foreground/70">
          Son valores aproximados: varían según la marca, la fórmula y tu piel.
        </p>

        <div className="mt-10 flex flex-col gap-4">
          {NOTES.map((note) => (
            <div
              key={note.title}
              className="flex flex-col gap-2 rounded border border-border bg-card p-6"
            >
              <h2 className="text-lg font-bold">{note.title}</h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                {note.body}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-8 rounded bg-secondary p-5 text-base leading-relaxed">
          Rociá en el pulso y el cuello, sin frotar. Con un decant podés ver
          cuánto dura en tu piel.
        </p>

        <Link
          href="/presentaciones"
          className="mt-12 flex min-h-11 items-center justify-between gap-4 rounded border border-dashed border-input p-5 hover:bg-muted lg:hidden"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-base font-bold">
              ¿Frasco entero o decant?
            </span>
            <span className="text-sm text-muted-foreground">
              Cuál te conviene según lo que buscás
            </span>
          </span>
          <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
        </Link>

        <PageCtaPair
          whatsappNumber={config.whatsappNumber}
          message="¡Hola! Tengo una duda sobre las concentraciones."
        />
      </article>
    </GuideShell>
  );
}
