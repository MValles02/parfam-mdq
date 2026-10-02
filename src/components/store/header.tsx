"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  { href: "/presentaciones", label: "Frasco, tester o decant" },
  { href: "/como-comprar", label: "Cómo comprar" },
  { href: "/contacto", label: "Contacto" },
] as const;

/** 46 px bordered square matching the mobile icon buttons. */
const MOBILE_ICON_BUTTON_CLASS = cn(
  "flex size-[46px] shrink-0 items-center justify-center rounded border border-input bg-card",
  FOCUS_VISIBLE,
);

const HIDE_DELTA_PX = 8;
const HEADER_HEIGHT_PX = 90;

/**
 * Reports whether the mobile header should be hidden: true after scrolling
 * down more than HIDE_DELTA_PX past the header height, false on any scroll up
 * or near the top. Starts visible so SSR and the first render match.
 */
function useHideOnScrollDown() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (y < HEADER_HEIGHT_PX || y < lastY) {
        setHidden(false);
        lastY = y;
      } else if (y - lastY > HIDE_DELTA_PX) {
        setHidden(true);
        lastY = y;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return hidden;
}

/**
 * Store header with desktop and mobile layouts. The mobile menu button and its
 * Sheet make content pages reachable on mobile.
 */
export function Header() {
  const pathname = usePathname();
  // This component owns the cart Sheet because the drawer's "Continuar" CTA
  // must close it when navigating (see cart-drawer.tsx).
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const scrolledDown = useHideOnScrollDown();
  const hidden = scrolledDown && !hasFocus && !isCartOpen;
  const quantity = useCartQuantity();
  const cartAccessibleLabel = cartLabel(quantity);

  const getLinkClassName = (href: string) =>
    cn(
      "flex min-h-11 items-center text-foreground",
      pathname === href
        ? "underline underline-offset-4"
        : "hover:text-muted-foreground",
    );

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <header
        // Only keyboard focus pins the header; a tap leaves focus on the
        // button, which would otherwise disable hide-on-scroll afterwards.
        onFocusCapture={(event) =>
          setHasFocus(event.target.matches(":focus-visible"))
        }
        onBlurCapture={() => setHasFocus(false)}
        className={cn(
          "sticky top-0 z-30 bg-background transition-transform duration-200 motion-reduce:transition-none lg:static lg:z-auto lg:translate-y-0 lg:bg-transparent",
          hidden && "-translate-y-full",
        )}
      >
        <span role="status" className="sr-only">
          {cartAccessibleLabel}
        </span>
        {/* Desktop */}
        <div className="mx-auto hidden max-w-page items-center justify-between px-16 py-6 lg:flex">
          <Link
            href="/"
            aria-label={`Ir al inicio de ${siteDefaults.name}`}
            className="flex min-h-11 items-center"
          >
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
                className="flex min-h-11 items-center"
              >
                <CartBadge variant="chip" />
              </button>
            </SheetTrigger>
          </div>
        </div>

        {/* Mobile */}
        <div className="flex items-center justify-between px-5 py-[18px] lg:hidden">
          <Link
            href="/"
            aria-label={`Ir al inicio de ${siteDefaults.name}`}
            className="relative before:absolute before:inset-x-0 before:-inset-y-2"
          >
            <Logo size="header" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/#catalogo"
              aria-label="Buscar en el catálogo"
              className={MOBILE_ICON_BUTTON_CLASS}
            >
              <Search className="size-[19px]" strokeWidth={1.6} />
            </Link>

            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={`Abrir el carrito, ${cartAccessibleLabel}`}
                className="flex"
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
              <SheetContent
                side="right"
                showCloseButton={false}
                className="gap-0 px-0"
              >
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
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={cn(
                      "absolute top-1 right-1 size-11 lg:top-3 lg:right-3 lg:size-7",
                      FOCUS_VISIBLE,
                    )}
                  >
                    <XIcon />
                    <span className="sr-only">Cerrar</span>
                  </Button>
                </SheetClose>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <CartDrawer close={() => setIsCartOpen(false)} />
    </Sheet>
  );
}
