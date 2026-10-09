"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartBadge } from "@/components/store/cart-badge";
import { CartDrawer } from "@/components/store/cart-drawer";
import { Logo } from "@/components/store/logo";
import {
  HOME_LINK_LABEL,
  MOBILE_NAVIGATION_LINKS,
  NAVIGATION_LINKS,
} from "@/components/store/navigation";
import { StoreSearch } from "@/components/store/catalog/search";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cartLabel, useCartQuantity } from "@/lib/cart";
import {
  GENDER_SHORTCUTS,
  KIND_SHORTCUTS,
} from "@/lib/store/catalog-shortcuts";
import { CATALOG_HREF } from "@/lib/store/links";
import { cn, FOCUS_VISIBLE } from "@/lib/utils";

/** 46 px bordered square matching the mobile icon buttons. */
const MOBILE_ICON_BUTTON_CLASS = cn(
  "flex size-[46px] shrink-0 items-center justify-center rounded border border-input bg-card",
  FOCUS_VISIBLE,
);

const HIDE_DELTA_PX = 8;
// Mobile header: py-3 (24) + 46 px icon row + gap-3 (12) + h-11 search (44).
const HEADER_HEIGHT_PX = 126;

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

function MenuHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="pt-5 pb-1 text-[11px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

/** 52 px menu row that closes the menu when followed. */
function MenuLink({
  href,
  current,
  children,
}: {
  href: string;
  current?: boolean;
  children: React.ReactNode;
}) {
  return (
    <SheetClose asChild>
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        className={cn(
          "flex h-[52px] items-center border-b border-border text-base font-medium hover:bg-muted",
          current && "underline underline-offset-4",
          FOCUS_VISIBLE,
        )}
      >
        {children}
      </Link>
    </SheetClose>
  );
}

/**
 * Store header with desktop and mobile layouts. The mobile menu button and its
 * Sheet make content pages reachable on mobile.
 */
export function Header({
  whatsappHref,
  instagramHandle,
}: {
  whatsappHref?: string;
  instagramHandle?: string;
}) {
  const pathname = usePathname();
  // This component owns the cart Sheet because the drawer's "Continuar" CTA
  // must close it when navigating (see cart-drawer.tsx).
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const scrolledDown = useHideOnScrollDown();
  const hidden = scrolledDown && !hasFocus && !isCartOpen;
  const quantity = useCartQuantity();
  const cartAccessibleLabel = cartLabel(quantity);
  const openCartLabel = `Abrir el carrito, ${cartAccessibleLabel}`;

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
        <p className="hidden bg-foreground px-16 py-2 text-center text-xs text-background lg:block">
          Originales · Entrega en Mar del Plata o retiro · Pedís por WhatsApp,
          sin pagar online
        </p>
        <div className="mx-auto hidden max-w-page items-center justify-between gap-9 px-16 py-6 lg:flex">
          <Link
            href="/"
            aria-label={HOME_LINK_LABEL}
            className="flex min-h-11 items-center"
          >
            <Logo size="header" />
          </Link>
          <div className="max-w-[560px] flex-1">
            {/* useSearchParams in the catalog search needs a boundary. */}
            <Suspense>
              <StoreSearch height="h-10" />
            </Suspense>
          </div>
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
                aria-label={openCartLabel}
                className="flex min-h-11 items-center"
              >
                <CartBadge variant="chip" />
              </button>
            </SheetTrigger>
          </div>
        </div>

        {/* Mobile */}
        <div className="flex flex-col gap-3 px-5 py-3 lg:hidden">
          <div className="grid grid-cols-[46px_1fr_46px] items-center">
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
                side="left"
                showCloseButton={false}
                className="gap-0 overflow-y-auto px-0"
              >
                <SheetHeader className="flex-row items-center justify-between py-2 pr-1 pl-5">
                  {/* Hidden because Radix requires an accessible title even
                      when the panel design has no visible heading. */}
                  <SheetTitle className="sr-only">
                    Menú de navegación
                  </SheetTitle>
                  <Logo size="header" />
                  <SheetClose asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={cn("size-11", FOCUS_VISIBLE)}
                    >
                      <XIcon />
                      <span className="sr-only">Cerrar</span>
                    </Button>
                  </SheetClose>
                </SheetHeader>
                <nav
                  aria-label="Navegación principal"
                  className="flex flex-col px-5"
                >
                  <MenuHeading>Fragancias</MenuHeading>
                  {GENDER_SHORTCUTS.map((item) => (
                    <MenuLink key={item.label} href={item.href}>
                      {item.label}
                    </MenuLink>
                  ))}
                  <MenuLink href={CATALOG_HREF}>Ver todas →</MenuLink>
                  <MenuHeading>Cómo lo llevás</MenuHeading>
                  {KIND_SHORTCUTS.map((item) => (
                    <MenuLink key={item.label} href={item.href}>
                      {item.label}
                    </MenuLink>
                  ))}
                  <MenuHeading>Antes de elegir</MenuHeading>
                  {MOBILE_NAVIGATION_LINKS.map((item) => (
                    <MenuLink
                      key={item.href}
                      href={item.href}
                      current={pathname === item.href}
                    >
                      {item.label}
                    </MenuLink>
                  ))}
                </nav>
                {whatsappHref && instagramHandle ? (
                  <div className="mt-auto flex flex-col gap-3 px-5 py-5">
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex h-12 items-center justify-center rounded bg-whatsapp px-4 text-sm font-medium text-whatsapp-foreground",
                        FOCUS_VISIBLE,
                      )}
                    >
                      Escribinos por WhatsApp
                    </a>
                    <p className="text-center text-xs text-muted-foreground">
                      @{instagramHandle} · Mar del Plata
                    </p>
                  </div>
                ) : null}
              </SheetContent>
            </Sheet>
            <Link
              href="/"
              aria-label={HOME_LINK_LABEL}
              className="relative justify-self-center before:absolute before:inset-x-0 before:-inset-y-2"
            >
              <Logo size="header" />
            </Link>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={openCartLabel}
                className="flex justify-self-end"
              >
                <CartBadge variant="button" />
              </button>
            </SheetTrigger>
          </div>
          <Suspense>
            <StoreSearch height="h-11" />
          </Suspense>
        </div>
      </header>

      <CartDrawer close={() => setIsCartOpen(false)} />
    </Sheet>
  );
}
