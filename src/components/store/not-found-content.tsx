import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSiteSettings } from "@/lib/settings";
import { CATALOG_HREF } from "@/lib/store/links";
import {
  CONTENT_PAGE_CLASS,
  CONTENT_PAGE_LEAD_CLASS,
  CONTENT_PAGE_TITLE_CLASS,
} from "@/components/store/content-page";
import { buildWhatsAppLink } from "@/lib/whatsapp";

/** Document title of both not-found pages and of an unknown product slug. */
export const NOT_FOUND_TITLE = "Página no encontrada";

/** Body shared by both not-found files (with and without the store chrome). */
export async function NotFoundContent() {
  const settings = await getSiteSettings();

  return (
    <div className={CONTENT_PAGE_CLASS}>
      <h1 className={CONTENT_PAGE_TITLE_CLASS}>No encontramos esta página</h1>
      <p className={CONTENT_PAGE_LEAD_CLASS}>
        Puede que el link haya cambiado o que el producto ya no esté disponible.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button asChild className="h-11 px-6 text-base">
          <Link href={CATALOG_HREF}>Ver el catálogo</Link>
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
