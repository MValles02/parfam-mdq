import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { CATALOG_HREF } from "@/lib/store/links";
import { buildWhatsAppLink } from "@/lib/whatsapp";

// Same height, width and type size on both so neither action outweighs the
// other; they stack on mobile and sit side by side from sm up.
const BUTTON =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded px-6 text-base font-semibold sm:flex-1";

export function PageCtaPair({
  whatsappNumber,
  message,
}: {
  whatsappNumber: string;
  message: string;
}) {
  return (
    <div className="mt-12 flex flex-col gap-3 sm:flex-row">
      <Link
        href={CATALOG_HREF}
        className={`${BUTTON} bg-primary text-primary-foreground hover:bg-primary/80`}
      >
        Ver el catálogo
      </Link>
      <a
        href={buildWhatsAppLink(whatsappNumber, message)}
        target="_blank"
        rel="noopener noreferrer"
        className={`${BUTTON} bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90`}
      >
        <MessageCircle className="size-5" />
        Consultar por WhatsApp
      </a>
    </div>
  );
}
