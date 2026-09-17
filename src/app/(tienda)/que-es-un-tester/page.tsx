import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { metadataDePagina, migasJsonLd, jsonLd } from "@/lib/seo";

const TITULO = "¿Qué es un tester?";
const RUTA = "/que-es-un-tester";

export const metadata: Metadata = metadataDePagina({
  titulo: TITULO,
  descripcion:
    "Qué es un tester de perfume, en qué se diferencia de un frasco entero y de un decant, y por qué sale más barato sin dejar de ser original.",
  ruta: RUTA,
});

const migas = [
  { nombre: "Inicio", ruta: "/" },
  { nombre: TITULO, ruta: RUTA },
];

const PRESENTACIONES = [
  {
    nombre: "Frasco entero",
    texto:
      "Viene sellado, con su estuche y todo el packaging original: es la presentación de siempre.",
  },
  {
    nombre: "Tester",
    texto:
      "El mismo perfume, en un envase simple y sin estuche. Por eso sale más barato sin perder originalidad.",
  },
  {
    nombre: "Decant",
    texto:
      "Una fracción del perfume pasada a un atomizador chico, ideal para probarlo antes de comprar el frasco entero.",
  },
];

export default function QueEsUnTesterPage() {
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

      <article>
        <h1 className="text-4xl font-extrabold tracking-[-0.03em] lg:text-6xl">
          {TITULO}
        </h1>

        <div className="mt-8 flex flex-col gap-6 text-lg leading-relaxed">
          <p>
            Un tester de fragancia es un producto completamente nuevo, que no ha
            sido utilizado previamente. Los testers son auténticos, frescos y
            100% originales, con la misma fragancia que el producto comercial.
          </p>
          <p>
            Los fabricantes crean estos testers, que pueden venir en envases
            simples y, en algunos casos, sin tapa decorativa. Gracias a esto,
            tienen un costo más bajo, y ese ahorro se traslada directamente al
            cliente.
          </p>
        </div>

        <div className="mt-14 rounded border border-border bg-card p-6 lg:p-8">
          <h2 className="text-sm font-bold tracking-[0.12em] text-muted-foreground uppercase">
            Frasco entero, tester o decant
          </h2>
          <dl className="mt-5 flex flex-col gap-5">
            {PRESENTACIONES.map((p) => (
              <div key={p.nombre} className="flex flex-col gap-1">
                <dt className="text-base font-bold">{p.nombre}</dt>
                <dd className="text-[15px] text-muted-foreground">{p.texto}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Link
          href="/catalogo"
          className="mt-12 inline-flex items-center gap-2 text-base font-semibold hover:text-muted-foreground"
        >
          Ver el catálogo
          <ArrowRight className="size-4" />
        </Link>
      </article>
    </div>
  );
}
