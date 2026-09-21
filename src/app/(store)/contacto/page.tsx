import Link from "next/link";
import type { Metadata } from "next";
import { AtSign, MapPin, MessageCircle } from "lucide-react";
import { getSiteSettings } from "@/lib/settings";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  serializeJsonLd,
} from "@/lib/seo";
import {
  buildInstagramLink,
  buildWhatsAppLink,
  formatPhoneNumber,
} from "@/lib/whatsapp";
import { siteDefaults } from "@/lib/site";

const PAGE_TITLE = "Contacto";
const PAGE_PATH = "/contacto";

export const metadata: Metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description:
    "Escribinos por WhatsApp o Instagram. Entregas y retiro en Mar del Plata, a coordinar.",
  path: PAGE_PATH,
});

const breadcrumbs = [
  { name: "Inicio", path: "/" },
  { name: PAGE_TITLE, path: PAGE_PATH },
];

export default async function ContactoPage() {
  const config = await getSiteSettings();

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: siteDefaults.legalName,
    url: absoluteUrl("/"),
    telephone: config.whatsappNumber,
    areaServed: siteDefaults.city,
    sameAs: [buildInstagramLink(config.instagramHandle)],
  };

  return (
    <div className="mx-auto max-w-[68ch] px-5 py-14 lg:px-16 lg:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildBreadcrumbJsonLd(breadcrumbs)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(organizationJsonLd),
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
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        WhatsApp es nuestro canal principal: escribinos para consultar
        disponibilidad, precios o coordinar tu pedido.
      </p>

      <a
        href={buildWhatsAppLink(
          config.whatsappNumber,
          "¡Hola! Quería hacerles una consulta.",
        )}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-10 flex items-center justify-center gap-2.5 rounded bg-primary px-6 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/80"
      >
        <MessageCircle className="size-5" />
        Escribinos por WhatsApp
      </a>

      <div className="mt-10 flex flex-col gap-5 rounded border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <MessageCircle className="size-[18px] shrink-0 text-muted-foreground" />
          <a
            href={buildWhatsAppLink(
              config.whatsappNumber,
              "¡Hola! Quería hacerles una consulta.",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[15px] font-medium hover:text-muted-foreground"
          >
            {formatPhoneNumber(config.whatsappNumber)}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <AtSign className="size-[18px] shrink-0 text-muted-foreground" />
          <a
            href={buildInstagramLink(config.instagramHandle)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[15px] font-medium hover:text-muted-foreground"
          >
            @{config.instagramHandle}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <MapPin className="size-[18px] shrink-0 text-muted-foreground" />
          <span className="text-[15px] font-medium">
            {siteDefaults.city} — entregas y retiro a coordinar
          </span>
        </div>
      </div>
    </div>
  );
}
