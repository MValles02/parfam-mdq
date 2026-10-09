import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CONCENTRATION_LABELS, GENDER_LABELS } from "@/lib/catalog";
import { getSiteSettings } from "@/lib/settings";
import {
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  productJsonLd,
} from "@/lib/seo";
import { catalogHref } from "@/lib/store/filters";
import { getBrandCatalogPath, getProductPath } from "@/lib/store/links";
import {
  getProductBySlug,
  getSimilarProducts,
  type PublicProduct,
} from "@/lib/store/queries";
import { NOT_FOUND_TITLE } from "@/components/store/not-found-content";
import { HOME_BREADCRUMB } from "@/components/store/content-page";
import { JsonLd } from "@/components/store/json-ld";
import { ProductCard } from "@/components/store/product-card";
import { MessageCircle } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { SECTION_TITLE_CLASS } from "@/components/store/product/section-styles";
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

/** "Dior · Eau de Toilette · Para él", the search description fallback. */
function getSearchSummary(product: PublicProduct): string {
  return [
    product.brandName,
    product.concentration ? CONCENTRATION_LABELS[product.concentration] : null,
    product.gender ? GENDER_LABELS[product.gender] : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** "Para él · 2015 · <perfumers>", below the product name. */
function getHeaderLine(product: PublicProduct): string {
  return [
    product.gender ? GENDER_LABELS[product.gender] : null,
    product.year ? String(product.year) : null,
    product.perfumers.length > 0 ? product.perfumers.join(", ") : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Taller touch target below `lg`, where the trail wraps. */
const CRUMB_LINK_CLASS =
  "inline-flex min-h-11 items-center hover:text-foreground lg:min-h-0";

/** Visible "Catálogo / <brand> / <product>" trail above the gallery. */
function ProductBreadcrumb({ product }: { product: PublicProduct }) {
  return (
    <nav aria-label="Miga de pan" className="pt-5 text-xs text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-x-2">
        <li>
          <Link href={catalogHref({})} className={CRUMB_LINK_CLASS}>
            Catálogo
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li>
          <Link
            href={catalogHref({ brand: product.brandSlug })}
            className={CRUMB_LINK_CLASS}
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
  );
}

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
  if (!product) return { title: { absolute: NOT_FOUND_TITLE } };

  return buildPageMetadata({
    title: product.seoTitle ?? `${product.name} — ${product.brandName}`,
    description:
      product.seoDescription ??
      product.description ??
      `${product.name} — ${getSearchSummary(product)}.`,
    path: getProductPath(product.slug),
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

  const headerLine = getHeaderLine(product);

  const breadcrumbs = [
    HOME_BREADCRUMB,
    { name: product.brandName, path: getBrandCatalogPath(product.brandSlug) },
    { name: product.name, path: getProductPath(product.slug) },
  ];

  return (
    <>
      <JsonLd
        data={productJsonLd(
          product,
          product.images.map((image) => image.url),
        )}
      />
      <JsonLd data={buildBreadcrumbJsonLd(breadcrumbs)} />

      <div className="mx-auto max-w-page px-5 pb-24 lg:px-16 lg:pb-0">
        <ProductBreadcrumb product={product} />

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
                <Link
                  href="/concentraciones"
                  className="mt-2 inline-flex min-h-11 w-fit items-center rounded border bg-card px-2.5 py-1 text-xs font-bold tracking-[0.04em] hover:bg-muted lg:min-h-0"
                >
                  {CONCENTRATION_LABELS[product.concentration]}
                </Link>
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
              variants={product.variants}
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
              <h2 className={`mb-5 ${SECTION_TITLE_CLASS}`}>
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
                  <h2 className={SECTION_TITLE_CLASS}>
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
