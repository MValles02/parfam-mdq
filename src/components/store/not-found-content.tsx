import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSiteSettings } from "@/lib/settings";
import { buildWhatsAppLink } from "@/lib/whatsapp";

/** Body shared by both not-found files (with and without the store chrome). */
export async function NotFoundContent() {
  const settings = await getSiteSettings();

  return (
    <div className="mx-auto max-w-[68ch] px-5 py-14 lg:px-16 lg:py-20">
      <h1 className="text-4xl font-extrabold tracking-[-0.03em] lg:text-6xl">
        No encontramos esta página
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        Puede que el link haya cambiado o que el producto ya no esté disponible.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button asChild className="h-11 px-6 text-base">
          <Link href="/#catalogo">Ver el catálogo</Link>
        </Button>
        <Button
          asChild
          className="h-11 bg-whatsapp px-6 text-base text-whatsapp-foreground hover:bg-whatsapp/90"
        >
          <a
            href={buildWhatsAppLink(
              settings.whatsappNumber,
              "¡Hola! No encontré una página en el sitio.",
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            Consultanos por WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
}
