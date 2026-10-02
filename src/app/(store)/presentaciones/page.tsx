import Link from "next/link";
import type { Metadata } from "next";
import {
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  serializeJsonLd,
} from "@/lib/seo";
import { PageCtaPair } from "@/components/store/page-cta-pair";
import { getSiteSettings } from "@/lib/settings";
import { PRESENTATIONS } from "@/lib/store/presentations";

const PAGE_TITLE = "Frasco, tester o decant";
const PAGE_PATH = "/presentaciones";

export const metadata: Metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description:
    "Qué es un tester de perfume, en qué se diferencia de un frasco entero y de un decant, y por qué sale más barato sin dejar de ser original.",
  path: PAGE_PATH,
});

const breadcrumbs = [
  { name: "Inicio", path: "/" },
  { name: PAGE_TITLE, path: PAGE_PATH },
];

export default async function PresentacionesPage() {
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

      <article>
        <h1 className="text-4xl font-extrabold tracking-[-0.03em] lg:text-6xl">
          {PAGE_TITLE}
        </h1>

        <p className="mt-8 text-lg leading-relaxed">
          Cada perfume te lo podemos ofrecer de tres formas. Las tres son el
          mismo perfume, nuevo y 100% original: lo que cambia es el envase y
          cuánto llevás.
        </p>

        <div className="mt-10 rounded border border-border bg-card p-6 lg:p-8">
          <h2 className="sr-only">Las tres presentaciones</h2>
          <dl className="flex flex-col gap-5">
            {PRESENTATIONS.map((variantKind) => (
              <div key={variantKind.name} className="flex flex-col gap-1">
                <dt className="text-base font-bold">{variantKind.name}</dt>
                <dd className="text-base text-muted-foreground">
                  {variantKind.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <h2 className="mt-12 text-lg font-bold">Más sobre el tester</h2>
        <p className="mt-2 text-lg leading-relaxed">
          El tester lo hace el mismo fabricante. Es nuevo, nunca se usó y tiene
          la misma fragancia que el frasco de venta. Viene en un envase simple,
          sin estuche y a veces sin la tapa decorativa. Por eso cuesta menos, y
          esa diferencia la pagás vos de menos.
        </p>

        <PageCtaPair
          whatsappNumber={config.whatsappNumber}
          message="¡Hola! Tengo una duda sobre frasco, tester o decant."
        />
      </article>
    </div>
  );
}
