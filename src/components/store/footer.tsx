import Link from "next/link";
import { Logo } from "@/components/store/logo";
import { getSiteSettings } from "@/lib/settings";
import {
  buildInstagramLink,
  buildWhatsAppLink,
  formatPhoneNumber,
} from "@/lib/whatsapp";
import { siteDefaults } from "@/lib/site";
import { cn, FOCUS_VISIBLE } from "@/lib/utils";

const STORE_LINKS = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/que-es-un-tester", label: "¿Qué es un tester?" },
  { href: "/como-comprar", label: "Cómo comprar" },
] as const;

const COLUMN_TITLE_CLASS =
  "text-[10px] font-bold tracking-[0.16em] text-muted-foreground uppercase";

/** Store footer with desktop and mobile layouts. */
export async function Footer() {
  const currentYear = new Date().getFullYear();
  const settings = await getSiteSettings();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-page">
        {/* Desktop */}
        <div className="hidden items-start justify-between px-16 py-12 lg:flex">
          <div className="flex flex-col gap-2.5">
            <Link href="/" aria-label={`Ir al inicio de ${siteDefaults.name}`}>
              <Logo size="footer" />
            </Link>
            <p className="text-[13px] text-muted-foreground">
              Perfumes originales en Mar del Plata.
            </p>
          </div>

          <div className="flex gap-[72px] text-[13px]">
            <div className="flex flex-col gap-2.5">
              <span className={COLUMN_TITLE_CLASS}>Tienda</span>
              {STORE_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-sm hover:text-muted-foreground",
                    FOCUS_VISIBLE,
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2.5">
              <span className={COLUMN_TITLE_CLASS}>Contacto</span>
              <a
                href={buildWhatsAppLink(settings.whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "rounded-sm hover:text-muted-foreground",
                  FOCUS_VISIBLE,
                )}
              >
                {formatPhoneNumber(settings.whatsappNumber)}
              </a>
              <a
                href={buildInstagramLink(settings.instagramHandle)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "rounded-sm hover:text-muted-foreground",
                  FOCUS_VISIBLE,
                )}
              >
                @{settings.instagramHandle}
              </a>
            </div>
          </div>
        </div>

        {/* Mobile */}
        <div className="flex flex-col gap-4 px-5 pt-7 pb-9 lg:hidden">
          <Link href="/" aria-label={`Ir al inicio de ${siteDefaults.name}`}>
            <span className="text-xl font-extrabold tracking-[-0.02em]">
              {siteDefaults.name}
            </span>
          </Link>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Perfumes originales en Mar del Plata.
            <br />
            <a
              href={buildWhatsAppLink(settings.whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("rounded-sm hover:text-foreground", FOCUS_VISIBLE)}
            >
              {formatPhoneNumber(settings.whatsappNumber)}
            </a>{" "}
            ·{" "}
            <a
              href={buildInstagramLink(settings.instagramHandle)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("rounded-sm hover:text-foreground", FOCUS_VISIBLE)}
            >
              @{settings.instagramHandle}
            </a>
          </p>
        </div>

        <div className="border-t border-border px-5 py-4 text-xs text-muted-foreground lg:px-16">
          © {currentYear} {siteDefaults.legalName}
        </div>
      </div>
    </footer>
  );
}
