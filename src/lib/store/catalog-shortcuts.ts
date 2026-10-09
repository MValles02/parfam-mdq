import { GENDER_LABELS } from "@/lib/catalog";
import { catalogHref } from "@/lib/store/filters";

/**
 * Entry points into the filtered catalog used by the home shortcuts and the
 * mobile menu. Only type imports reach Prisma, so client components can use it.
 */
export const GENDER_SHORTCUTS = (["MEN", "WOMEN", "UNISEX"] as const).map(
  (gender) => ({
    label: GENDER_LABELS[gender],
    href: catalogHref({ gender }),
  }),
);

export const KIND_SHORTCUTS = [
  { label: "Decants", href: catalogHref({ variantKind: "DECANT" }) },
  {
    label: "Frascos enteros",
    href: catalogHref({ variantKind: "FULL_BOTTLE" }),
  },
];

export const LATEST_SHORTCUT = {
  label: "Novedades",
  href: catalogHref({ sort: "latest" }),
};
