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
import { getProductBySlug, getRelatedProducts } from "@/lib/store/queries";
import { AccordChip } from "@/components/store/accord-chip";
import { ProductCard } from "@/components/store/product-card";
import { Separator } from "@/components/ui/separator";
import { Gallery } from "@/components/store/product/gallery";
import { Purchase } from "@/components/store/product/purchase";
import { Pyramid } from "@/components/store/product/pyramid";
import { TechnicalDetails } from "@/components/store/product/technical-details";
import { CharacteristicBars } from "@/components/store/product/characteristic-bars";

/**
 * Product detail queries return null for drafts, so notFound safely rejects a
 * direct draft slug even if no catalog link points to it.
 */
export async function generateMetadata(
  props: PageProps<"/producto/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

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

  const relatedProducts = await getRelatedProducts({
    id: product.id,
    brandSlug: product.brandSlug,
    accords: product.accords,
  });

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
    { name: "Catálogo", path: "/catalogo" },
    { name: product.brandName, path: `/marca/${product.brandSlug}` },
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

      <div className="mx-auto max-w-[1440px] px-5 lg:px-16">
        <p className="pt-5 text-xs text-muted-foreground">
          <Link href="/catalogo" className="hover:text-foreground">
            Catálogo
          </Link>
          {" · "}
          <Link
            href={`/marca/${product.brandSlug}`}
            className="hover:text-foreground"
          >
            {product.brandName}
          </Link>
          {` · ${product.name}`}
        </p>

        <div className="flex flex-col gap-9 py-7 lg:flex-row lg:gap-14">
          <div className="lg:w-[620px] lg:shrink-0">
            <Gallery images={product.images} />
          </div>

          <div className="flex flex-1 flex-col">
            <Link
              href={`/marca/${product.brandSlug}`}
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

            {product.accords.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {product.accords.map((accord) => (
                  <AccordChip
                    key={accord.slug}
                    name={accord.name}
                    color={accord.color}
                  />
                ))}
              </div>
            ) : null}

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
            perfumers={product.perfumers}
            year={product.year}
            concentration={product.concentration}
            gender={product.gender}
            seasons={product.seasons}
            occasions={product.occasions}
          />
          <CharacteristicBars
            longevity={product.longevity}
            sillage={product.sillage}
            intensity={product.intensity}
          />
        </section>

        {relatedProducts.length > 0 ? (
          <section className="border-t py-11">
            <h2 className="text-[32px] font-extrabold tracking-[-0.025em]">
              Te puede gustar
            </h2>
            <div className="mt-7 grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-7">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct.slug}
                  product={relatedProduct}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
