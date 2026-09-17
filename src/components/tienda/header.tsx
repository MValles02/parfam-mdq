"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { BadgeCarrito } from "@/components/tienda/badge-carrito";
import { Logotipo } from "@/components/tienda/logotipo";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { siteDefaults } from "@/lib/site";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/que-es-un-tester", label: "¿Qué es un tester?" },
  { href: "/como-comprar", label: "Cómo comprar" },
  { href: "/contacto", label: "Contacto" },
] as const;

/** Cuadrado de 46px con borde, igual a los botones de icono de mobile. */
const CUADRADO =
  "flex size-[46px] shrink-0 items-center justify-center rounded border border-border bg-card";

/**
 * Header de la tienda. Desktop sale de design/Main.dc.html (1440px), mobile
 * de design/HomeMobile.dc.html (390px). El mockup mobile solo dibuja lupa y
 * carrito: el boton de menu y el Sheet que abre son un agregado nuestro
 * porque sin eso las paginas de contenido (Contacto, Como comprar, etc.) no
 * tienen forma de alcanzarse desde mobile. Ver reporte de la tarea.
 */
export function Header() {
  const pathname = usePathname();

  const claseLink = (href: string) =>
    cn(
      pathname === href
        ? "text-muted-foreground"
        : "text-foreground hover:text-muted-foreground",
    );

  return (
    <header>
      {/* Desktop */}
      <div className="mx-auto hidden max-w-[1440px] items-center justify-between px-16 py-6 lg:flex">
        <Link href="/" aria-label={`Ir al inicio de ${siteDefaults.name}`}>
          <Logotipo tamanio="barra" />
        </Link>
        <div className="flex items-center gap-9">
          <nav
            aria-label="Navegación principal"
            className="flex items-center gap-9 text-sm font-medium"
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={claseLink(item.href)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <BadgeCarrito variante="chip" />
        </div>
      </div>

      {/* Mobile */}
      <div className="flex items-center justify-between px-5 py-[18px] lg:hidden">
        <Link href="/" aria-label={`Ir al inicio de ${siteDefaults.name}`}>
          <Logotipo tamanio="barra" />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/catalogo"
            aria-label="Buscar en el catálogo"
            className={CUADRADO}
          >
            <Search className="size-[19px]" strokeWidth={1.6} />
          </Link>

          <BadgeCarrito variante="boton" />

          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Abrir menú"
                className={CUADRADO}
              >
                <Menu className="size-[19px]" strokeWidth={1.6} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="gap-0 px-0">
              <SheetHeader>
                {/* Oculto: Radix exige un titulo accesible aunque el diseno
                    no muestre encabezado dentro del panel. */}
                <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
              </SheetHeader>
              <nav
                aria-label="Navegación principal"
                className="flex flex-col gap-1 px-3"
              >
                {NAV.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex min-h-11 items-center rounded px-3 text-base font-medium",
                        pathname === item.href
                          ? "text-muted-foreground"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
