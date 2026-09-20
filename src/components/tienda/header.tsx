"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { BadgeCarrito } from "@/components/tienda/badge-carrito";
import { CarritoDrawer } from "@/components/tienda/carrito-drawer";
import { Logotipo } from "@/components/tienda/logotipo";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { etiquetaCarrito, useCantidadCarrito } from "@/lib/carrito";
import { siteDefaults } from "@/lib/site";
import { cn, FOCO_VISIBLE } from "@/lib/utils";

const NAV = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/que-es-un-tester", label: "¿Qué es un tester?" },
  { href: "/como-comprar", label: "Cómo comprar" },
  { href: "/contacto", label: "Contacto" },
] as const;

/** Cuadrado de 46px con borde, igual a los botones de icono de mobile. */
const CUADRADO = cn(
  "flex size-[46px] shrink-0 items-center justify-center rounded border border-input bg-card",
  FOCO_VISIBLE,
);

/**
 * Header de la tienda, con un layout para desktop y otro para mobile. En
 * mobile el boton de menu y el Sheet que abre son un agregado nuestro: sin
 * eso las paginas de contenido (Contacto, Como comprar, etc.) no tienen
 * forma de alcanzarse desde mobile.
 */
export function Header() {
  const pathname = usePathname();
  // Dueño del Sheet del carrito: vive aca (y no sin controlar) porque el
  // CTA "Finalizar pedido por WhatsApp" del drawer necesita poder cerrarlo
  // el mismo al navegar (ver carrito-drawer.tsx).
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const cantidad = useCantidadCarrito();
  const etiqueta = etiquetaCarrito(cantidad);

  const claseLink = (href: string) =>
    cn(
      "text-foreground",
      pathname === href
        ? "underline underline-offset-4"
        : "hover:text-muted-foreground",
    );

  return (
    <Sheet open={carritoAbierto} onOpenChange={setCarritoAbierto}>
      <header>
        <span role="status" className="sr-only">
          {etiqueta}
        </span>
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
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={claseLink(item.href)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={`Abrir el carrito, ${etiqueta}`}
                className="contents"
              >
                <BadgeCarrito variante="chip" />
              </button>
            </SheetTrigger>
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

            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={`Abrir el carrito, ${etiqueta}`}
                className="contents"
              >
                <BadgeCarrito variante="boton" />
              </button>
            </SheetTrigger>

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
                  <SheetTitle className="sr-only">
                    Menú de navegación
                  </SheetTitle>
                </SheetHeader>
                <nav
                  aria-label="Navegación principal"
                  className="flex flex-col gap-1 px-3"
                >
                  {NAV.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={
                          pathname === item.href ? "page" : undefined
                        }
                        className={cn(
                          "flex min-h-11 items-center rounded px-3 text-base font-medium",
                          pathname === item.href
                            ? "text-foreground underline underline-offset-4"
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

      <CarritoDrawer cerrar={() => setCarritoAbierto(false)} />
    </Sheet>
  );
}
