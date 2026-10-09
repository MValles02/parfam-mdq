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

const PAGE_TITLE = "Frasco o decant";
const PAGE_PATH = "/presentaciones";

export const metadata: Metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description:
    "Frasco entero o decant: en qué se diferencian, cuánto llevás con cada uno y cuál te conviene. Es el mismo perfume original.",
  path: PAGE_PATH,
});

const CARDS = [
  {
    name: "Decant",
    description:
      "Una porción del perfume original pasada a un atomizador chico. Ideal para probar o para tener variedad.",
  },
  {
    name: "Frasco entero",
    description:
      "Tal cual sale de fábrica, sellado y en su caja. Para tu perfume de todos los días o para regalar.",
  },
];

const COMPARISON = [
  {
    row: "Cantidad",
    decant: "Pocos ml (figura en cada producto)",
    bottle: "El tamaño del frasco (figura en cada producto)",
  },
  { row: "Precio por ml", decant: "Más alto", bottle: "Más bajo" },
  {
    row: "Cómo viene",
    decant: "Atomizador",
    bottle: "Sellado, con su caja",
  },
  {
    row: "Te sirve si",
    decant: "Querés probar sin gastar de más",
    bottle: "Ya sabés que te encanta, o es un regalo",
  },
];

const CHOICES = [
  {
    situation: "Nunca lo probé",
    pick: "Un decant",
    reason:
      "Lo usás unos días y ves cómo evoluciona en tu piel antes de comprar el frasco.",
  },
  {
    situation: "Quiero varios para rotar",
    pick: "Decants",
    reason: "Probás varios aromas sin comprar un frasco de cada uno.",
  },
  {
    situation: "Ya es mi perfume de siempre",
    pick: "Frasco entero",
    reason: "Te sale más barato por ml.",
  },
  {
    situation: "Es para regalar",
    pick: "Frasco entero",
    reason: "Llega sellado y en su caja.",
  },
];

const FAQS = [
  {
    question: "¿El decant es original?",
    answer: "Sí, se pasa de un frasco original; no se diluye ni se mezcla.",
  },
  {
    question: "¿Dura lo mismo en la piel?",
    answer:
      "Sí, es el mismo líquido; la duración depende de la concentración, no del envase.",
  },
  {
    question: "Si me gusta, ¿después compro el frasco?",
    answer: "Escribinos por WhatsApp y te contamos si lo tenemos.",
  },
];

export default async function PresentacionesPage() {
  const config = await getSiteSettings();

  return (
    <GuideShell current={PAGE_PATH} title={PAGE_TITLE}>
      <article>
        <h1 className="text-4xl font-extrabold tracking-[-0.03em] lg:text-6xl">
          ¿Frasco entero o decant?
        </h1>

        <p className="mt-8 text-lg leading-relaxed">
          Es el mismo perfume original. Lo que cambia es cuánto llevás y cómo
          viene.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {CARDS.map((card) => (
            <div
              key={card.name}
              className="flex flex-col gap-2 rounded border border-border bg-card p-6"
            >
              <h2 className="text-lg font-bold">{card.name}</h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                {card.description}
              </p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-lg font-bold">Lado a lado</h2>
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>
                <span className="sr-only">Característica</span>
              </TableHead>
              <TableHead>Decant</TableHead>
              <TableHead>Frasco entero</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {COMPARISON.map((item) => (
              <TableRow key={item.row}>
                <TableCell className="font-bold whitespace-normal">
                  {item.row}
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
                  {item.decant}
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
                  {item.bottle}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <h2 className="mt-12 text-lg font-bold">¿Cuál te conviene?</h2>
        <dl className="mt-4 flex flex-col gap-5">
          {CHOICES.map((choice) => (
            <div key={choice.situation} className="flex flex-col gap-1">
              <dt className="text-base font-bold">
                {choice.situation} → {choice.pick}
              </dt>
              <dd className="text-base leading-relaxed text-muted-foreground">
                {choice.reason}
              </dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-12 text-lg font-bold">Preguntas</h2>
        <dl className="mt-4 flex flex-col gap-5">
          {FAQS.map((faq) => (
            <div key={faq.question} className="flex flex-col gap-1">
              <dt className="text-base font-bold">{faq.question}</dt>
              <dd className="text-base leading-relaxed text-muted-foreground">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>

        <Link
          href="/concentraciones"
          className="mt-12 flex min-h-11 items-center justify-between gap-4 rounded border border-dashed border-input p-5 hover:bg-muted lg:hidden"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-base font-bold">
              ¿Y qué es EDT, EDP o Parfum?
            </span>
            <span className="text-sm text-muted-foreground">
              Cuánto dura cada concentración
            </span>
          </span>
          <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
        </Link>

        <PageCtaPair
          whatsappNumber={config.whatsappNumber}
          message="¡Hola! Tengo una duda sobre frasco o decant."
        />
      </article>
    </GuideShell>
  );
}
