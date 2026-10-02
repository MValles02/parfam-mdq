import Link from "next/link";
import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings";
import {
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  serializeJsonLd,
} from "@/lib/seo";
import { PageCtaPair } from "@/components/store/page-cta-pair";

const PAGE_TITLE = "Cómo comprar";
const PAGE_PATH = "/como-comprar";

export const metadata: Metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description:
    "Cómo funciona una compra en ParfamMdq: elegís la fragancia, la agregás al carrito y coordinamos la entrega por WhatsApp.",
  path: PAGE_PATH,
});

const breadcrumbs = [
  { name: "Inicio", path: "/" },
  { name: PAGE_TITLE, path: PAGE_PATH },
];

const STEPS = [
  {
    title: "Elegís la fragancia y la presentación",
    description:
      "Recorré el catálogo y elegí entre frasco entero, tester o decant, en el tamaño que quieras probar.",
  },
  {
    title: "La agregás al carrito",
    description:
      "Sumá una o varias fragancias. Podés seguir mirando el catálogo antes de cerrar el pedido.",
  },
  {
    title: "Mandás el pedido por WhatsApp",
    description:
      "Dejás tu nombre y teléfono, guardamos el pedido con un número y se abre WhatsApp con el detalle listo para mandar. No pedimos datos de pago.",
  },
  {
    title: "Coordinamos entrega y pago",
    description:
      "Por WhatsApp vemos entrega en Mar del Plata o retiro, y coordinamos cómo pagás.",
  },
];

const FAQS = [
  {
    question: "¿Son originales?",
    answer: "Sí. Frascos, testers y decants son 100% originales.",
  },
  {
    question: "¿Qué es un decant y qué es un tester?",
    answer: (
      <>
        Un tester es el mismo perfume, nuevo y original, en un envase simple y
        sin estuche: por eso sale más barato. Un decant es una fracción del
        perfume en un atomizador chico, para probarlo sin comprar el frasco
        entero. Comparamos las tres presentaciones en{" "}
        <Link
          href="/presentaciones"
          className="relative underline underline-offset-2 before:absolute before:inset-x-0 before:-inset-y-3 hover:text-foreground"
        >
          Frasco, tester o decant
        </Link>
        .
      </>
    ),
  },
  {
    question: "¿Hacen envíos?",
    answer:
      "Sí, entregamos en Mar del Plata, o podés retirar. Lo coordinamos por WhatsApp.",
  },
];

export default async function HowToBuyPage() {
  const config = await getSiteSettings();

  return (
    <div className="mx-auto max-w-[68ch] px-5 py-14 lg:px-16 lg:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildBreadcrumbJsonLd(breadcrumbs)),
        }}
      />

      <nav
        aria-label="Miga de pan"
        className="mb-8 text-sm text-muted-foreground"
      >
        <Link
          href="/"
          className="relative before:absolute before:inset-x-0 before:-inset-y-4 hover:text-foreground lg:before:content-none"
        >
          Inicio
        </Link>
        <span className="mx-2">·</span>
        <span className="text-foreground">{PAGE_TITLE}</span>
      </nav>

      <h1 className="text-4xl font-extrabold tracking-[-0.03em] lg:text-6xl">
        {PAGE_TITLE}
      </h1>

      <ol className="mt-10 flex flex-col gap-8">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-5">
            <span
              aria-hidden="true"
              className="w-8 shrink-0 text-3xl leading-none font-extrabold tracking-[-0.03em]"
            >
              {index + 1}
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold">{step.title}</h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <PageCtaPair
        whatsappNumber={config.whatsappNumber}
        message="¡Hola! Tengo una consulta antes de comprar."
      />

      <section className="mt-16 border-t border-border pt-10">
        <h2 className="text-sm font-bold tracking-[0.12em] text-muted-foreground uppercase">
          Preguntas frecuentes
        </h2>
        <dl className="mt-6 flex flex-col gap-6">
          {FAQS.map((faq) => (
            <div key={faq.question} className="flex flex-col gap-1.5">
              <dt className="text-base font-bold">{faq.question}</dt>
              <dd className="text-base leading-relaxed text-muted-foreground">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
