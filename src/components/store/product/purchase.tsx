"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, MessageCircle, Plus } from "lucide-react";
import type { VariantKind } from "@/generated/prisma/enums";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { formatArsPrice, VARIANT_KIND_LABELS } from "@/lib/catalog";
import { MAX_ITEM_QUANTITY, useCart } from "@/lib/cart";
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

const VARIANT_DESCRIPTIONS: Partial<Record<VariantKind, string>> = {
  FULL_BOTTLE: "Sellado, con estuche",
  DECANT: "Fraccionado en atomizador",
};

function buildInquiryMessage(product: PurchaseProduct) {
  return `¡Hola! Quería consultar por el ${product.name} de ${product.brandName}.`;
}

/** Small uppercase caption above each group of purchase options. */
const OPTION_GROUP_LABEL_CLASS =
  "text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase";

/** Bordered radio row; only the border color changes so layout never shifts. */
function OptionCard({
  id,
  value,
  active,
  children,
}: {
  id: string;
  value: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-12 cursor-pointer items-center gap-3 rounded border-[1.5px] bg-card px-3.5 py-2",
        active ? "border-foreground" : "border-input",
      )}
    >
      <RadioGroupItem value={value} id={id} />
      {children}
    </label>
  );
}

/** Minus/plus control that keeps the quantity within 1..MAX_ITEM_QUANTITY. */
function QuantityStepper({
  quantity,
  onChange,
}: {
  quantity: number;
  onChange: (update: (currentQuantity: number) => number) => void;
}) {
  return (
    <div className="flex items-center rounded border bg-card">
      <button
        type="button"
        aria-label="Quitar una unidad"
        onClick={() =>
          onChange((currentQuantity) => Math.max(1, currentQuantity - 1))
        }
        disabled={quantity <= 1}
        className={cn(
          "flex size-12 items-center justify-center text-muted-foreground disabled:opacity-40",
          FOCUS_VISIBLE,
        )}
      >
        <Minus className="size-4" />
      </button>
      <span className="min-w-7 text-center text-base font-bold">
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Agregar una unidad"
        onClick={() =>
          onChange((currentQuantity) =>
            Math.min(MAX_ITEM_QUANTITY, currentQuantity + 1),
          )
        }
        disabled={quantity >= MAX_ITEM_QUANTITY}
        className={cn(
          "flex size-12 items-center justify-center disabled:opacity-40",
          FOCUS_VISIBLE,
        )}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

/** Mobile bar pinned to the bottom while the main add-to-cart button is off screen. */
function StickyAddToCartBar({
  variant,
  onAddToCart,
}: {
  variant: ProductVariant;
  onAddToCart: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t bg-background px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-xs text-muted-foreground">
          {variant.label}
        </span>
        <span className="text-lg leading-tight font-extrabold">
          {formatArsPrice(variant.price)}
        </span>
      </div>
      <Button
        type="button"
        onClick={onAddToCart}
        className="min-h-11 shrink-0 text-[15px] font-semibold"
      >
        Agregar al carrito
      </Button>
    </div>
  );
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
  const router = useRouter();
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
  const kinds = [...new Set(variants.map((variant) => variant.kind))];
  const sizeVariants = variants.filter(
    (variant) => variant.kind === selectedVariant.kind,
  );

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
      // The cart drawer's open state is local to the header, so the action
      // navigates to the cart page instead.
      action: { label: "Ver carrito", onClick: () => router.push("/carrito") },
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="sr-only">Comprar</h2>

      {kinds.length > 1 ? (
        <div>
          <p className={`mb-2 ${OPTION_GROUP_LABEL_CLASS}`}>
            Presentación
          </p>
          <RadioGroup
            aria-label="Presentación"
            value={selectedVariant.kind}
            onValueChange={(kind) =>
              setSelectedVariantId(
                variants.find((variant) => variant.kind === kind)?.id ?? null,
              )
            }
            className="grid-cols-2 gap-2"
          >
            {kinds.map((kind) => (
              <OptionCard
                key={kind}
                id={`${idBase}-kind-${kind}`}
                value={kind}
                active={kind === selectedVariant.kind}
              >
                <span className="text-[15px] font-semibold">
                  {VARIANT_KIND_LABELS[kind]}
                </span>
              </OptionCard>
            ))}
          </RadioGroup>
        </div>
      ) : null}

      <div>
        <p className={`mb-2 ${OPTION_GROUP_LABEL_CLASS}`}>
          Tamaño
        </p>
        <RadioGroup
          aria-label="Tamaño"
          value={selectedVariant.id}
          onValueChange={setSelectedVariantId}
          className="grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {sizeVariants.map((variant) => (
            <OptionCard
              key={variant.id}
              id={`${idBase}-size-${variant.id}`}
              value={variant.id}
              active={variant.id === selectedVariant.id}
            >
              <span className="flex flex-1 items-center justify-between gap-3">
                <span className="text-[15px]">
                  {variant.sizeMl !== null
                    ? `${variant.sizeMl} ml`
                    : variant.label}
                </span>
                <span className="text-[15px] font-bold">
                  {formatArsPrice(variant.price)}
                </span>
              </span>
            </OptionCard>
          ))}
        </RadioGroup>
        <p className="mt-2 text-sm text-muted-foreground">
          {VARIANT_DESCRIPTIONS[selectedVariant.kind] &&
            `${VARIANT_DESCRIPTIONS[selectedVariant.kind]}. `}
          <Link
            href="/presentaciones"
            className="inline-flex min-h-11 items-center text-foreground underline underline-offset-2"
          >
            ¿Cuál me conviene?
          </Link>
        </p>
      </div>

      <div className="flex gap-2.5">
        <QuantityStepper quantity={quantity} onChange={setQuantity} />
        <Button
          ref={ctaRef}
          type="button"
          onClick={addToCart}
          className="h-auto min-h-12 min-w-0 flex-1 py-3 text-[15px] font-semibold whitespace-normal"
        >
          Agregar al carrito · {selectedVariant.label}
        </Button>
      </div>

      {ctaVisible === false ? (
        <StickyAddToCartBar variant={selectedVariant} onAddToCart={addToCart} />
      ) : null}
    </div>
  );
}
