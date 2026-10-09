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

function buildSteps(shippingInfo: string) {
  return [
    {
      title: "Elegís tus fragancias",
      description:
        "Recorré el catálogo y elegí: decant para probar o frasco entero.",
    },
    {
      title: "Las sumás al carrito",
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
      description: shippingInfo,
    },
  ];
}

function buildFaqs(shippingInfo: string) {
  return [
    { question: "¿Son originales?", answer: "Sí, todos." },
    {
      question: "¿Qué es un decant?",
      answer: (
        <>
          Una porción del perfume original en un atomizador chico. Lo comparamos
          con el frasco entero en{" "}
          <Link
            href="/presentaciones"
            className="relative underline underline-offset-2 before:absolute before:inset-x-0 before:-inset-y-3 hover:text-foreground"
          >
            Frasco o decant
          </Link>
          .
        </>
      ),
    },
    { question: "¿Hacen envíos?", answer: shippingInfo },
    {
      question: "¿La web cobra?",
      answer: "No. La web no cobra nada: el pago lo coordinamos por WhatsApp.",
    },
    {
      question: "¿Puedo cambiar el pedido?",
      answer: "Escribinos con tu número de pedido (por ejemplo, PM-0042).",
    },
  ];
}

export default async function HowToBuyPage() {
  const config = await getSiteSettings();
  const steps = buildSteps(config.shippingInfo);
  const faqs = buildFaqs(config.shippingInfo);

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
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        Sin pagar online: armás el pedido acá y lo cerramos por WhatsApp.
      </p>

      <ol className="mt-10 flex flex-col gap-8">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-5">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground"
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
          {faqs.map((faq) => (
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
