import { describe, expect, it } from "vitest";
import { migrateCartState } from "./cart";

describe("migrateCartState", () => {
  it("preserves every v1 cart item field and migrates imagen to image", () => {
    const versionOneState = {
      items: [
        {
          variantId: "variant-1",
          productSlug: "acqua-di-gio",
          productName: "Acqua di Giò",
          brandName: "Giorgio Armani",
          variantLabel: "100 ml",
          unitPriceArs: "125000.00",
          imagen: "products/acqua-di-gio.jpg",
          qty: 2,
        },
      ],
    };

    expect(migrateCartState(versionOneState, 1).items).toEqual([
      {
        variantId: "variant-1",
        productSlug: "acqua-di-gio",
        productName: "Acqua di Giò",
        brandName: "Giorgio Armani",
        variantLabel: "100 ml",
        unitPriceArs: "125000.00",
        image: "products/acqua-di-gio.jpg",
        qty: 2,
      },
    ]);
  });

  it("passes current v2 persisted data through unchanged", () => {
    const versionTwoState = {
      items: [
        {
          variantId: "variant-2",
          productSlug: "eau-sauvage",
          productName: "Eau Sauvage",
          brandName: "Dior",
          variantLabel: "60 ml",
          unitPriceArs: "98000.00",
          image: null,
          qty: 1,
        },
      ],
    };

    expect(migrateCartState(versionTwoState, 2)).toBe(versionTwoState);
  });
});
