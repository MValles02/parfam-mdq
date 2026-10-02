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
import { Separator } from "@/components/ui/separator";
import { Gallery } from "@/components/store/product/gallery";
import { Purchase } from "@/components/store/product/purchase";
import { Pyramid } from "@/components/store/product/pyramid";
import { TechnicalDetails } from "@/components/store/product/technical-details";
import { CharacteristicBars } from "@/components/store/product/characteristic-bars";
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

  const metadataLine = [
    product.concentration ? CONCENTRATION_LABELS[product.concentration] : null,
    product.year ? String(product.year) : null,
    product.gender ? GENDER_LABELS[product.gender] : null,
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
        <p className="pt-5 text-xs text-muted-foreground">
          <Link
            href="/"
            className="relative before:absolute before:inset-x-0 before:-inset-y-4 hover:text-foreground lg:before:content-none"
          >
            Catálogo
          </Link>
          {" · "}
          <Link
            href={`/?marca=${product.brandSlug}#catalogo`}
            className="relative before:absolute before:inset-x-0 before:-inset-y-4 hover:text-foreground lg:before:content-none"
          >
            {product.brandName}
          </Link>
          {` · ${product.name}`}
        </p>

        <div className="flex flex-col gap-9 py-7 lg:flex-row lg:gap-14">
          <div className="lg:w-[520px] lg:shrink-0 xl:w-[620px]">
            <Gallery images={product.images} />
          </div>

          <div className="flex flex-1 flex-col">
            <Link
              href={`/?marca=${product.brandSlug}#catalogo`}
              className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase hover:text-foreground"
            >
              {product.brandName}
            </Link>
            <h1 className="mt-2 text-[32px] leading-[1.05] font-extrabold tracking-[-0.035em] lg:text-[52px]">
              {product.name}
            </h1>
            {metadataLine ? (
              <p className="mt-2.5 text-sm text-muted-foreground">
                {metadataLine}
              </p>
            ) : null}

            <AccordBars accords={product.accords} />

            {product.description ? (
              <p className="mt-6 max-w-prose text-base leading-relaxed">
                {product.description}
              </p>
            ) : null}

            <Separator className="my-7" />

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

            <p className="mt-6 text-xs text-muted-foreground">
              Envío en Mar del Plata · Retiro a convenir · 100% original
            </p>
          </div>
        </div>

        <Pyramid
          levels={product.pyramid.map((level) => ({
            level: level.level,
            notes: level.notes.map((note) => ({
              slug: note.slug,
              name: note.name,
            })),
          }))}
        />

        <section className="grid grid-cols-1 gap-6 border-t pt-11 lg:grid-cols-2">
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
              Se parece a
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
