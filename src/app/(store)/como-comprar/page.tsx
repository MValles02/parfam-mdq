import Link from "next/link";
import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings";
import {
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  serializeJsonLd,
} from "@/lib/seo";
import { buildWhatsAppLink } from "@/lib/whatsapp";

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
      "Con un toque armamos el mensaje con el detalle de tu pedido, listo para mandar.",
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
    answer: (
      <>
        Si. Frascos, testers y decants son 100% originales; en{" "}
        <Link
          href="/que-es-un-tester"
          className="underline underline-offset-2 hover:text-foreground"
        >
          ¿Qué es un tester?
        </Link>{" "}
        contamos la diferencia entre presentaciones.
      </>
    ),
  },
  {
    question: "¿Qué es un decant?",
    answer: (
      <>
        Es una fracción del perfume en un atomizador chico, para probarlo sin
        comprar el frasco entero. Más detalle en{" "}
        <Link
          href="/que-es-un-tester"
          className="underline underline-offset-2 hover:text-foreground"
        >
          ¿Qué es un tester?
        </Link>
        .
      </>
    ),
  },
  {
    question: "¿Hacen envíos?",
    answer:
      "Coordinamos entrega en Mar del Plata o retiro; escribinos por WhatsApp y vemos qué te queda mejor.",
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
        <Link href="/" className="hover:text-foreground">
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
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
            >
              {index + 1}
            </span>
            <div className="flex flex-col gap-1 pt-1">
              <h2 className="text-lg font-bold">{step.title}</h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <a
        href={buildWhatsAppLink(
          config.whatsappNumber,
          "¡Hola! Tengo una consulta antes de comprar.",
        )}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-12 inline-flex items-center gap-2 rounded bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/80"
      >
        Consultar por WhatsApp
      </a>

      <section className="mt-16 border-t border-border pt-10">
        <h2 className="text-sm font-bold tracking-[0.12em] text-muted-foreground uppercase">
          Preguntas frecuentes
        </h2>
        <dl className="mt-6 flex flex-col gap-6">
          {FAQS.map((faq) => (
            <div key={faq.question} className="flex flex-col gap-1.5">
              <dt className="text-base font-bold">{faq.question}</dt>
              <dd className="text-[15px] leading-relaxed text-muted-foreground">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
