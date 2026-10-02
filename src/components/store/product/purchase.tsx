"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Minus, MessageCircle, Plus } from "lucide-react";
import type { VariantKind } from "@/generated/prisma/enums";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { formatArsPrice } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { cn, FOCUS_VISIBLE } from "@/lib/utils";

type ProductVariant = {
  id: string;
  kind: VariantKind;
  sizeMl: number | null;
  label: string;
  price: string;
};

type PurchaseProduct = {
  slug: string;
  name: string;
  brandName: string;
  image: string | null;
};

const MAX_QUANTITY = 99;

const VARIANT_DESCRIPTIONS: Record<VariantKind, string> = {
  FULL_BOTTLE: "Sellado, con estuche",
  TESTER: "Nuevo, envase simple",
  DECANT: "Fraccionado en atomizador",
};

function buildInquiryMessage(
  product: PurchaseProduct,
  variant?: ProductVariant,
) {
  const presentation = variant ? ` (${variant.label})` : "";
  return `¡Hola! Quería consultar por el ${product.name} de ${product.brandName}${presentation}.`;
}

/**
 * Product purchase controls require local client state for the selected
 * variant and quantity, neither of which belongs in a shareable URL.
 */
export function Purchase({
  product,
  variants,
  whatsappNumber,
}: {
  product: PurchaseProduct;
  variants: ProductVariant[];
  /** The server parent resolves this because Client Components cannot import Prisma. */
  whatsappNumber: string;
}) {
  const idBase = useId();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants[0]?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const add = useCart((state) => state.add);
  const ctaRef = useRef<HTMLButtonElement>(null);
  // null until the observer reports, so server and first client render match.
  const [ctaVisible, setCtaVisible] = useState<boolean | null>(null);

  useEffect(() => {
    const cta = ctaRef.current;
    if (!cta) return;
    const observer = new IntersectionObserver(([entry]) =>
      setCtaVisible(entry.isIntersecting),
    );
    observer.observe(cta);
    return () => observer.disconnect();
  }, [variants.length]);

  if (variants.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Consultanos el precio por WhatsApp
        </p>
        <Button asChild className="h-auto w-full gap-2 py-5 text-[15px]">
          <a
            href={buildWhatsAppLink(
              whatsappNumber,
              buildInquiryMessage(product),
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-4" />
            Consultar por WhatsApp
          </a>
        </Button>
      </div>
    );
  }

  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];

  function decrementQuantity() {
    setQuantity((currentQuantity) => Math.max(1, currentQuantity - 1));
  }

  function incrementQuantity() {
    setQuantity((currentQuantity) =>
      Math.min(MAX_QUANTITY, currentQuantity + 1),
    );
  }

  function addToCart() {
    add(
      {
        variantId: selectedVariant.id,
        productSlug: product.slug,
        productName: product.name,
        brandName: product.brandName,
        variantLabel: selectedVariant.label,
        unitPriceArs: selectedVariant.price,
        image: product.image,
      },
      quantity,
    );
    const unitLabel = quantity === 1 ? "unidad" : "unidades";
    toast.success("Agregado al carrito", {
      description: `${product.name} · ${selectedVariant.label} · ${quantity} ${unitLabel}`,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3.5 text-[11px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
          Elegí tu presentación
        </p>

        <RadioGroup
          value={selectedVariantId ?? undefined}
          onValueChange={setSelectedVariantId}
          className="gap-2.5"
        >
          {variants.map((variant) => {
            const isActive = variant.id === selectedVariantId;
            const id = `${idBase}-${variant.id}`;
            return (
              <label
                key={variant.id}
                htmlFor={id}
                className={cn(
                  // Keep the border width constant and change only its color:
                  // switching from 1px to 1.5px shifts the row by half a pixel.
                  "flex cursor-pointer items-center justify-between rounded border-[1.5px] p-4",
                  isActive ? "border-foreground" : "border-input",
                )}
              >
                <div className="flex items-center gap-3.5">
                  <RadioGroupItem value={variant.id} id={id} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">
                      {variant.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {VARIANT_DESCRIPTIONS[variant.kind]}
                    </span>
                  </div>
                </div>
                <span className="text-lg font-bold">
                  {formatArsPrice(variant.price)}
                </span>
              </label>
            );
          })}
        </RadioGroup>

        {variants.some((variant) => variant.kind === "TESTER") ? (
          <p className="mt-3 text-xs text-muted-foreground">
            <Link
              href="/presentaciones"
              className="underline underline-offset-2 hover:text-foreground"
            >
              ¿Frasco, tester o decant? Te explicamos
            </Link>
          </p>
        ) : null}
      </div>

      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {selectedVariant.label}
          </span>
          <span className="text-[38px] leading-none font-extrabold tracking-[-0.03em]">
            {formatArsPrice(selectedVariant.price)}
          </span>
        </div>

        <div className="flex items-center gap-3 rounded border bg-card">
          <button
            type="button"
            aria-label="Quitar una unidad"
            onClick={decrementQuantity}
            disabled={quantity <= 1}
            className={cn(
              "flex size-11 items-center justify-center text-muted-foreground disabled:opacity-40",
              FOCUS_VISIBLE,
            )}
          >
            <Minus className="size-4" />
          </button>
          <span className="min-w-4 text-center text-base font-bold">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Agregar una unidad"
            onClick={incrementQuantity}
            disabled={quantity >= MAX_QUANTITY}
            className={cn(
              "flex size-11 items-center justify-center disabled:opacity-40",
              FOCUS_VISIBLE,
            )}
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <Button
          ref={ctaRef}
          type="button"
          onClick={addToCart}
          className="h-auto w-full py-5 text-[15px] font-semibold"
        >
          Agregar al carrito · {selectedVariant.label}
        </Button>

        <Button
          asChild
          variant="outline"
          className="h-auto w-full gap-2 py-4 text-[15px]"
        >
          <a
            href={buildWhatsAppLink(
              whatsappNumber,
              buildInquiryMessage(product, selectedVariant),
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-4" />
            Consultar por WhatsApp
          </a>
        </Button>
      </div>

      {ctaVisible === false ? (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t bg-background px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs text-muted-foreground">
              {selectedVariant.label}
            </span>
            <span className="text-lg leading-tight font-extrabold">
              {formatArsPrice(selectedVariant.price)}
            </span>
          </div>
          <Button
            type="button"
            onClick={addToCart}
            className="min-h-11 shrink-0 text-[15px] font-semibold"
          >
            Agregar al carrito
          </Button>
        </div>
      ) : null}
    </div>
  );
}
