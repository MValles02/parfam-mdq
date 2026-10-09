import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CONCENTRATION_LABELS, GENDER_LABELS } from "@/lib/catalog";
import { getSiteSettings } from "@/lib/settings";
import {
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  productJsonLd,
  serializeJsonLd,
} from "@/lib/seo";
import { getProductBySlug, getSimilarProducts } from "@/lib/store/queries";
import { ProductCard } from "@/components/store/product-card";
import { MessageCircle } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { catalogHref } from "@/lib/store/filters";
import { Gallery } from "@/components/store/product/gallery";
import { Purchase } from "@/components/store/product/purchase";
import { Pyramid } from "@/components/store/product/pyramid";
import { TechnicalDetails } from "@/components/store/product/technical-details";
import { CharacteristicBars } from "@/components/store/product/characteristic-bars";
import { KeyFacts } from "@/components/store/product/key-facts";
import { CollapsibleSection } from "@/components/store/product/collapsible-section";
import { AccordBars } from "@/components/store/product/accord-bars";
import { VoteProfile } from "@/components/store/product/vote-profile";
import { SimilarProducts } from "@/components/store/product/similar-products";

/**
 * Product detail queries return null for drafts, so notFound safely rejects a
 * direct draft slug even if no catalog link points to it.
 */
export async function generateMetadata(
  props: PageProps<"/producto/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  // Matches `not-found.tsx`; returning `{}` would let the site default title
  // replace it once the page hydrates.
  if (!product) return { title: { absolute: "Página no encontrada" } };

  const metadata = [
    product.brandName,
    product.concentration ? CONCENTRATION_LABELS[product.concentration] : null,
    product.gender ? GENDER_LABELS[product.gender] : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return buildPageMetadata({
    title: product.seoTitle ?? `${product.name} — ${product.brandName}`,
    description:
      product.seoDescription ??
      product.description ??
      `${product.name} — ${metadata}.`,
    path: `/producto/${product.slug}`,
  });
}

export default async function Page(props: PageProps<"/producto/[slug]">) {
  const { slug } = await props.params;
  const [product, settings] = await Promise.all([
    getProductBySlug(slug),
    getSiteSettings(),
  ]);
  if (!product) notFound();

  const similarProducts = await getSimilarProducts(product.id);

  const headerLine = [
    product.gender ? GENDER_LABELS[product.gender] : null,
    product.year ? String(product.year) : null,
    product.perfumers.length > 0 ? product.perfumers.join(", ") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const breadcrumbs = [
    { name: "Inicio", path: "/" },
    { name: product.brandName, path: `/?marca=${product.brandSlug}` },
    { name: product.name, path: `/producto/${product.slug}` },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            productJsonLd(
              product,
              product.images.map((image) => image.url),
            ),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildBreadcrumbJsonLd(breadcrumbs)),
        }}
      />

      <div className="mx-auto max-w-page px-5 pb-24 lg:px-16 lg:pb-0">
        <nav
          aria-label="Miga de pan"
          className="pt-5 text-xs text-muted-foreground"
        >
          <ol className="flex flex-wrap items-center gap-x-2">
            <li>
              <Link
                href={catalogHref({})}
                className="inline-flex min-h-11 items-center hover:text-foreground lg:min-h-0"
              >
                Catálogo
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link
                href={catalogHref({ brand: product.brandSlug })}
                className="inline-flex min-h-11 items-center hover:text-foreground lg:min-h-0"
              >
                {product.brandName}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-foreground">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 gap-7 py-5 lg:grid-cols-2 lg:gap-14 lg:py-7">
          <div className="min-w-0">
            <Gallery images={product.images} />
          </div>

          <div className="flex w-full min-w-0 flex-col gap-5 lg:max-w-[520px]">
            <div className="flex flex-col gap-1.5">
              <Link
                href={catalogHref({ brand: product.brandSlug })}
                className="inline-flex min-h-11 w-fit items-center text-[13px] font-semibold tracking-[0.14em] text-muted-foreground uppercase hover:text-foreground lg:min-h-0"
              >
                {product.brandName}
              </Link>
              <h1 className="text-[32px] leading-[1.05] font-extrabold tracking-[-0.035em] lg:text-[44px]">
                {product.name}
              </h1>
              {headerLine ? (
                <p className="text-[15px] text-muted-foreground">
                  {headerLine}
                </p>
              ) : null}
              {product.concentration ? (
                <span className="mt-2 w-fit rounded border bg-card px-2.5 py-1 text-xs font-bold tracking-[0.04em]">
                  {CONCENTRATION_LABELS[product.concentration]}
                </span>
              ) : null}
            </div>

            <KeyFacts
              longevity={product.longevity}
              sillage={product.sillage}
              seasons={product.seasons}
              dayparts={product.dayparts}
            />

            <Purchase
              product={{
                slug: product.slug,
                name: product.name,
                brandName: product.brandName,
                image: product.images[0]?.url ?? null,
              }}
              variants={product.variants.map((variant) => ({
                id: variant.id,
                kind: variant.kind,
                sizeMl: variant.sizeMl,
                label: variant.label,
                price: variant.price,
              }))}
              whatsappNumber={settings.whatsappNumber}
            />

            <a
              href={buildWhatsAppLink(
                settings.whatsappNumber,
                `¡Hola! Quería consultar por el ${product.name} de ${product.brandName}.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-2 text-sm"
            >
              <MessageCircle className="size-[18px] text-whatsapp" />
              <span>
                ¿Dudas?{" "}
                <span className="underline underline-offset-3">
                  Preguntanos por WhatsApp
                </span>
              </span>
            </a>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-x-14 lg:grid-cols-2">
          {product.accords.length > 0 ? (
            <div className="border-t pt-11">
              <h2 className="mb-5 text-2xl font-extrabold tracking-[-0.025em] lg:text-[32px]">
                A qué huele
              </h2>
              <AccordBars accords={product.accords} />
            </div>
          ) : null}
          <div>
            <Pyramid
              levels={product.pyramid.map((level) => ({
                level: level.level,
                notes: level.notes.map((note) => ({
                  slug: note.slug,
                  name: note.name,
                })),
              }))}
            />
            {product.description ? (
              <CollapsibleSection
                className="border-t pt-11"
                defaultOpenOnMobile
                title={
                  <h2 className="text-2xl font-extrabold tracking-[-0.025em] lg:text-[32px]">
                    Descripción
                  </h2>
                }
              >
                <p className="mt-4 max-w-prose text-base leading-relaxed">
                  {product.description}
                </p>
              </CollapsibleSection>
            ) : null}
          </div>
        </section>

        <section className="mt-11 grid grid-cols-1 gap-6 border-t pt-11 lg:grid-cols-2">
          <TechnicalDetails
            brandName={product.brandName}
            brandSlug={product.brandSlug}
            collection={product.collection}
            perfumers={product.perfumers}
            year={product.year}
            concentration={product.concentration}
            gender={product.gender}
          />
          <CharacteristicBars
            longevity={product.longevity}
            sillage={product.sillage}
            intensity={product.intensity}
          />
        </section>

        <VoteProfile seasons={product.seasons} dayparts={product.dayparts} />

        {similarProducts.length > 0 ? (
          <section className="border-t py-11">
            <h2 className="text-[32px] font-extrabold tracking-[-0.025em]">
              Si te gusta, probá también
            </h2>
            <SimilarProducts>
              {similarProducts.map((similarProduct) => (
                <ProductCard
                  key={similarProduct.slug}
                  product={similarProduct}
                />
              ))}
            </SimilarProducts>
          </section>
        ) : null}
      </div>
    </>
  );
}
