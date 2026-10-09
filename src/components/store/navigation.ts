import { siteDefaults } from "@/lib/site";

/** Store content pages linked from the footer. */
export const STORE_INFO_LINKS = [
  { href: "/presentaciones", label: "Frasco o decant" },
  { href: "/concentraciones", label: "Concentraciones" },
  { href: "/como-comprar", label: "Cómo comprar" },
] as const;

/**
 * The desktop nav stays at three links; the concentrations guide is reachable
 * from the mobile menu, the footer and the product page chip.
 */
export const NAVIGATION_LINKS = [
  { href: "/presentaciones", label: "Frasco o decant" },
  { href: "/como-comprar", label: "Cómo comprar" },
  { href: "/contacto", label: "Contacto" },
] as const;

/** The mobile menu adds the concentrations guide. */
export const MOBILE_NAVIGATION_LINKS = [
  NAVIGATION_LINKS[0],
  { href: "/concentraciones", label: "Concentraciones" },
  NAVIGATION_LINKS[1],
  NAVIGATION_LINKS[2],
] as const;

/** Accessible name of every logo link back to the home page. */
export const HOME_LINK_LABEL = `Ir al inicio de ${siteDefaults.name}`;
