"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { CartBadge } from "@/components/store/cart-badge";
import { CartDrawer } from "@/components/store/cart-drawer";
import { Logo } from "@/components/store/logo";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cartLabel, useCartQuantity } from "@/lib/cart";
import { siteDefaults } from "@/lib/site";
import { cn, FOCUS_VISIBLE } from "@/lib/utils";

const NAVIGATION_LINKS = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/que-es-un-tester", label: "¿Qué es un tester?" },
  { href: "/como-comprar", label: "Cómo comprar" },
  { href: "/contacto", label: "Contacto" },
] as const;

/** 46 px bordered square matching the mobile icon buttons. */
const MOBILE_ICON_BUTTON_CLASS = cn(
  "flex size-[46px] shrink-0 items-center justify-center rounded border border-input bg-card",
  FOCUS_VISIBLE,
);

/**
 * Store header with desktop and mobile layouts. The mobile menu button and its
 * Sheet make content pages reachable on mobile.
 */
export function Header() {
  const pathname = usePathname();
  // This component owns the cart Sheet because the drawer's "Finalizar pedido
  // por WhatsApp" CTA must close it when navigating (see cart-drawer.tsx).
  const [isCartOpen, setIsCartOpen] = useState(false);
  const quantity = useCartQuantity();
  const cartAccessibleLabel = cartLabel(quantity);

  const getLinkClassName = (href: string) =>
    cn(
      "text-foreground",
      pathname === href
        ? "underline underline-offset-4"
        : "hover:text-muted-foreground",
    );

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <header>
        <span role="status" className="sr-only">
          {cartAccessibleLabel}
        </span>
        {/* Desktop */}
        <div className="mx-auto hidden max-w-[1440px] items-center justify-between px-16 py-6 lg:flex">
          <Link href="/" aria-label={`Ir al inicio de ${siteDefaults.name}`}>
            <Logo size="header" />
          </Link>
          <div className="flex items-center gap-9">
            <nav
              aria-label="Navegación principal"
              className="flex items-center gap-9 text-sm font-medium"
            >
              {NAVIGATION_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={getLinkClassName(item.href)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={`Abrir el carrito, ${cartAccessibleLabel}`}
                className="contents"
              >
                <CartBadge variant="chip" />
              </button>
            </SheetTrigger>
          </div>
        </div>

        {/* Mobile */}
        <div className="flex items-center justify-between px-5 py-[18px] lg:hidden">
          <Link href="/" aria-label={`Ir al inicio de ${siteDefaults.name}`}>
            <Logo size="header" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/catalogo"
              aria-label="Buscar en el catálogo"
              className={MOBILE_ICON_BUTTON_CLASS}
            >
              <Search className="size-[19px]" strokeWidth={1.6} />
            </Link>

            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={`Abrir el carrito, ${cartAccessibleLabel}`}
                className="contents"
              >
                <CartBadge variant="button" />
              </button>
            </SheetTrigger>

            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Abrir menú"
                  className={MOBILE_ICON_BUTTON_CLASS}
                >
                  <Menu className="size-[19px]" strokeWidth={1.6} />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="gap-0 px-0">
                <SheetHeader>
                  {/* Hidden because Radix requires an accessible title even
                      when the panel design has no visible heading. */}
                  <SheetTitle className="sr-only">
                    Menú de navegación
                  </SheetTitle>
                </SheetHeader>
                <nav
                  aria-label="Navegación principal"
                  className="flex flex-col gap-1 px-3"
                >
                  {NAVIGATION_LINKS.map((item) => (
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

      <CartDrawer close={() => setIsCartOpen(false)} />
    </Sheet>
  );
}
