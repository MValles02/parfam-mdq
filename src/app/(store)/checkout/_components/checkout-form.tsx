"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PriceChangeAlert } from "@/components/store/cart/price-change-alert";
import { EmptyCart } from "@/components/store/cart/cart-item-list";
import { formatArsPrice } from "@/lib/catalog";
import { unitsLabel, useCart, useHydrated } from "@/lib/cart";
import { useCartReconciliation } from "@/lib/store/use-cart-reconciliation";
import {
  checkoutCustomerSchema,
  type CheckoutCustomerInput,
} from "@/lib/validations/checkout";
import { createOrder } from "../actions";

/**
 * Fixed phone prefix: the customer only enters the local number, never the
 * country code or mobile "9". This avoids the ambiguity of guessing whether
 * they entered "0223 15…" or "223…".
 */
const PHONE_PREFIX = "+54 9";

/**
 * Final checkout step. The honeypot deliberately uses `useRef` instead of
 * react-hook-form or `checkoutCustomerSchema`: normal validation would expose
 * a Zod error for a field the customer cannot see in form state. It is read
 * manually on submission.
 */
export function CheckoutForm({
  shippingInfo,
}: {
  /** `SiteSetting.shippingInfo`, resolved by the parent Server Component with
   * a fallback when the administrator has not set it; see `getSiteSettings`. */
  shippingInfo: string;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const items = useCart((state) => state.items);
  const remove = useCart((state) => state.remove);
  const { changes, discardChanges, isChecking } = useCartReconciliation();
  const [isSubmitting, startSubmitting] = useTransition();
  const honeypotRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState, setError } =
    useForm<CheckoutCustomerInput>({
      resolver: standardSchemaResolver(checkoutCustomerSchema),
      defaultValues: { customerName: "", customerPhone: "" },
      mode: "onSubmit",
    });

  if (!hydrated) return null;

  if (items.length === 0) {
    return <EmptyCart />;
  }

  const total = items.reduce(
    (acc, i) => acc + Number(i.unitPriceArs) * i.qty,
    0,
  );
  const canSubmit = changes.length === 0 && !isChecking;

  function handleSubmitClick() {
    // Open the popup synchronously with the click. Safari and strict Chrome
    // block it after an `await`. It starts blank and receives its destination
    // only after the Server Action responds.
    const popup = window.open("", "_blank");

    void handleSubmit(
      (values) => {
        startSubmitting(async () => {
          const result = await createOrder({
            customerName: values.customerName,
            customerPhone: `${PHONE_PREFIX} ${values.customerPhone}`,
            items: items.map((i) => ({
              variantId: i.variantId,
              qty: i.qty,
            })),
            company: honeypotRef.current?.value ?? "",
          });

          if (!result.ok) {
            const { message, fieldErrors, invalidItems } = result;
            popup?.close();
            if (invalidItems) {
              for (const invalidItem of invalidItems) {
                remove(invalidItem.variantId);
              }
            }
            // Field errors such as "no parece un número argentino válido" use
            // server-side phone validation; this form only renders them. See
            // the comment in `checkoutCustomerSchema`.
            for (const [field, messages] of Object.entries(fieldErrors ?? {})) {
              if (field === "customerName" || field === "customerPhone") {
                setError(field, { message: messages[0] });
              }
            }
            toast.error(message);
            return;
          }

          const { orderNumber, link } = result;
          if (popup) {
            popup.location.href = link;
          }
          // The link embeds the customer's name and order contents, so it
          // travels via sessionStorage instead of the URL (history, logs,
          // Referer). `_customer-thanks.tsx` reads the same key.
          try {
            sessionStorage.setItem(`whatsapp-link:${orderNumber}`, link);
          } catch {
            // Storage unavailable: the thank-you page shows its generic fallback.
          }
          router.push(`/pedido/${orderNumber}/gracias`);
        });
      },
      () => {
        // The form is invalid, so the blank popup has no destination.
        popup?.close();
      },
    )();
  }

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:gap-14">
      <div className="flex max-w-[680px] flex-col gap-8">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
            Último paso
          </p>
          <h1 className="mt-2.5 text-4xl leading-[1.05] font-extrabold tracking-[-0.03em] sm:text-[46px]">
            ¿A nombre de quién armamos el pedido?
          </h1>
          <p className="mt-3.5 text-[15px] leading-relaxed text-muted-foreground">
            Con esto generamos el pedido y abrimos WhatsApp con todo escrito. El
            resto — envío o retiro, y cómo pagás — lo arreglás por chat.
          </p>
        </div>

        <Alert>
          <ShieldCheck />
          <AlertTitle className="text-xs font-medium text-muted-foreground">
            No pedimos datos de pago. El pedido se cierra por WhatsApp.
          </AlertTitle>
        </Alert>

        <PriceChangeAlert changes={changes} onDiscard={discardChanges} />

        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="checkout-customer-name"
              className="text-xs uppercase"
            >
              Tu nombre
            </Label>
            <Input
              id="checkout-customer-name"
              placeholder="Nombre y apellido"
              autoComplete="name"
              className="h-auto py-4 text-base"
              aria-invalid={!!formState.errors.customerName}
              {...register("customerName")}
            />
            {formState.errors.customerName ? (
              <p className="text-xs text-destructive">
                {formState.errors.customerName.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="checkout-customer-phone"
              className="text-xs uppercase"
            >
              Tu teléfono
            </Label>
            <div className="flex items-stretch overflow-hidden rounded-lg border border-input">
              <span className="flex items-center border-r border-input bg-muted px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground sm:px-4">
                {PHONE_PREFIX}
              </span>
              <Input
                id="checkout-customer-phone"
                placeholder="223 616 3910"
                autoComplete="tel-national"
                inputMode="tel"
                className="h-auto border-0 py-4 text-base"
                aria-invalid={!!formState.errors.customerPhone}
                {...register("customerPhone")}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {formState.errors.customerPhone?.message ??
                "Por si se corta el chat y tenemos que escribirte."}
            </p>
          </div>

          {/* Honeypot: hidden from people and visible to bots that complete
              every input. It avoids `hidden`, which some bots intentionally
              skip, and is positioned offscreen instead. */}
          <div
            className="absolute -left-[9999px]"
            aria-hidden="true"
            tabIndex={-1}
          >
            <label htmlFor="checkout-company">Empresa</label>
            <input
              id="checkout-company"
              name="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              ref={honeypotRef}
            />
          </div>

          <Button
            type="button"
            onClick={handleSubmitClick}
            disabled={!canSubmit || isSubmitting}
            className="h-auto gap-3 bg-whatsapp py-[22px] text-base font-semibold text-whatsapp-foreground hover:bg-whatsapp/90"
          >
            {isSubmitting ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <MessageCircle className="size-5" />
            )}
            {isChecking
              ? "Verificando tu carrito…"
              : isSubmitting
                ? "Armando el pedido…"
                : "Enviar pedido por WhatsApp"}
          </Button>
        </form>
      </div>

      <div className="flex h-fit flex-col rounded border bg-card p-7 lg:w-[440px] lg:shrink-0">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold tracking-[-0.015em]">
            Tu pedido
          </span>
          <span className="text-xs text-muted-foreground">
            {unitsLabel(items.reduce((total, i) => total + i.qty, 0))}
          </span>
        </div>

        <div className="mt-5 flex flex-col">
          {items.map((item) => (
            <div
              key={item.variantId}
              className="flex items-start justify-between gap-4 border-b py-3.5 last:border-b-0"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm leading-[1.25] font-semibold">
                  {item.productName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.variantLabel} · x{item.qty}
                </span>
              </div>
              <span className="text-sm font-bold whitespace-nowrap">
                {formatArsPrice(
                  (Number(item.unitPriceArs) * item.qty).toFixed(2),
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-[32px] font-extrabold tracking-[-0.03em]">
            {formatArsPrice(total.toFixed(2))}
          </span>
        </div>

        <div className="my-5 h-px bg-border" />

        <ul className="flex flex-col gap-3 text-[13px] leading-relaxed text-foreground/90">
          <li>{shippingInfo}</li>
          <li>Todos los productos son originales.</li>
          <li>Guardamos el pedido con un número para seguirlo por chat.</li>
        </ul>
      </div>
    </div>
  );
}
