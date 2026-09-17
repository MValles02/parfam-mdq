import Link from "next/link";
import type { Metadata } from "next";
import { metadataDePagina, migasJsonLd, jsonLd } from "@/lib/seo";
import { linkWhatsapp } from "@/lib/whatsapp";

const TITULO = "Cómo comprar";
const RUTA = "/como-comprar";

export const metadata: Metadata = metadataDePagina({
  titulo: TITULO,
  descripcion:
    "Cómo funciona una compra en ParfamMdq: elegís la fragancia, la agregás al carrito y coordinamos la entrega por WhatsApp.",
  ruta: RUTA,
});

const migas = [
  { nombre: "Inicio", ruta: "/" },
  { nombre: TITULO, ruta: RUTA },
];

const PASOS = [
  {
    titulo: "Elegís la fragancia y la presentación",
    texto:
      "Recorré el catálogo y elegí entre frasco entero, tester o decant, en el tamaño que quieras probar.",
  },
  {
    titulo: "La agregás al carrito",
    texto:
      "Sumá una o varias fragancias. Podés seguir mirando el catálogo antes de cerrar el pedido.",
  },
  {
    titulo: "Mandás el pedido por WhatsApp",
    texto:
      "Con un toque armamos el mensaje con el detalle de tu pedido, listo para mandar.",
  },
  {
    titulo: "Coordinamos entrega y pago",
    texto:
      "Por WhatsApp vemos entrega en Mar del Plata o retiro, y coordinamos cómo pagás.",
  },
];

const PREGUNTAS = [
  {
    pregunta: "¿Son originales?",
    respuesta: (
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
    pregunta: "¿Qué es un decant?",
    respuesta: (
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
    pregunta: "¿Hacen envíos?",
    respuesta:
      "Coordinamos entrega en Mar del Plata o retiro; escribinos por WhatsApp y vemos qué te queda mejor.",
  },
];

export default function ComoComprarPage() {
  return (
    <div className="mx-auto max-w-[68ch] px-5 py-14 lg:px-16 lg:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(migasJsonLd(migas)) }}
      />

      <nav
        aria-label="Miga de pan"
        className="mb-8 text-sm text-muted-foreground"
      >
        <Link href="/" className="hover:text-foreground">
          Inicio
        </Link>
        <span className="mx-2">·</span>
        <span className="text-foreground">{TITULO}</span>
      </nav>

      <h1 className="text-4xl font-extrabold tracking-[-0.03em] lg:text-6xl">
        {TITULO}
      </h1>

      <ol className="mt-10 flex flex-col gap-8">
        {PASOS.map((paso, i) => (
          <li key={paso.titulo} className="flex gap-5">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
            >
              {i + 1}
            </span>
            <div className="flex flex-col gap-1 pt-1">
              <h2 className="text-lg font-bold">{paso.titulo}</h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                {paso.texto}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <a
        href={linkWhatsapp("¡Hola! Tengo una consulta antes de comprar.")}
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
          {PREGUNTAS.map((p) => (
            <div key={p.pregunta} className="flex flex-col gap-1.5">
              <dt className="text-base font-bold">{p.pregunta}</dt>
              <dd className="text-[15px] leading-relaxed text-muted-foreground">
                {p.respuesta}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
