import Link from "next/link";
import { Logotipo } from "@/components/tienda/logotipo";
import { obtenerConfiguracionSitio } from "@/lib/configuracion";
import { linkInstagramA, linkWhatsappA, telefonoVisible } from "@/lib/whatsapp";
import { siteDefaults } from "@/lib/site";

const LINKS_TIENDA = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/que-es-un-tester", label: "¿Qué es un tester?" },
  { href: "/como-comprar", label: "Cómo comprar" },
] as const;

const TITULO_COLUMNA =
  "text-[10px] font-bold tracking-[0.16em] text-muted-foreground uppercase";

/** Footer de la tienda (design/Main.dc.html y design/HomeMobile.dc.html). */
export async function Footer() {
  const anioActual = new Date().getFullYear();
  const config = await obtenerConfiguracionSitio();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-[1440px]">
        {/* Desktop */}
        <div className="hidden items-start justify-between px-16 py-12 lg:flex">
          <div className="flex flex-col gap-2.5">
            <Link href="/" aria-label={`Ir al inicio de ${siteDefaults.name}`}>
              <Logotipo tamanio="pie" />
            </Link>
            <p className="text-[13px] text-muted-foreground">
              Perfumes originales en Mar del Plata.
            </p>
          </div>

          <div className="flex gap-[72px] text-[13px]">
            <div className="flex flex-col gap-2.5">
              <span className={TITULO_COLUMNA}>Tienda</span>
              {LINKS_TIENDA.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="hover:text-muted-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2.5">
              <span className={TITULO_COLUMNA}>Contacto</span>
              <a
                href={linkWhatsappA(config.whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-muted-foreground"
              >
                {telefonoVisible(config.whatsappNumber)}
              </a>
              <a
                href={linkInstagramA(config.instagramHandle)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-muted-foreground"
              >
                @{config.instagramHandle}
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
              href={linkWhatsappA(config.whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              {telefonoVisible(config.whatsappNumber)}
            </a>{" "}
            ·{" "}
            <a
              href={linkInstagramA(config.instagramHandle)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              @{config.instagramHandle}
            </a>
          </p>
        </div>

        <div className="border-t border-border px-5 py-4 text-xs text-muted-foreground lg:px-16">
          © {anioActual} {siteDefaults.legalName}
        </div>
      </div>
    </footer>
  );
}
