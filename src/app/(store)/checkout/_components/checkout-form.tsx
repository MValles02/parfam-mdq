"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import Link from "next/link";
import { Check, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PriceChangeAlert } from "@/components/store/cart/price-change-alert";
import { CartItemRow } from "@/components/store/cart/cart-item-row";
import { EmptyCart } from "@/components/store/cart/cart-item-list";
import { formatArsPrice } from "@/lib/catalog";
import { cn } from "@/lib/utils";
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

  const { register, handleSubmit, formState, setError, getValues } =
    useForm<CheckoutCustomerInput>({
      resolver: standardSchemaResolver(checkoutCustomerSchema),
      defaultValues: { customerName: "", customerPhone: "" },
      mode: "onBlur",
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

  const units = items.reduce((acc, i) => acc + i.qty, 0);

  function handleSubmitClick() {
    // Validate before opening anything: an invalid form must not leave a
    // blank tab behind. `handleSubmit` below renders the errors and focuses
    // the first invalid field.
    if (!checkoutCustomerSchema.safeParse(getValues()).success) {
      void handleSubmit(() => {})();
      return;
    }

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
            // Field errors render inline and move focus to the field; the toast
            // is reserved for errors that have no field (stock, network, etc.).
            let hasFieldError = false;
            for (const [field, messages] of Object.entries(fieldErrors ?? {})) {
              if (field === "customerName" || field === "customerPhone") {
                setError(
                  field,
                  { message: messages[0] },
                  { shouldFocus: !hasFieldError },
                );
                hasFieldError = true;
              }
            }
            if (!hasFieldError) toast.error(message);
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

  const steps = ["Carrito", "Tus datos", "WhatsApp"];

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)] lg:gap-14">
      <div className="flex min-w-0 flex-col gap-5">
        <div>
          <h1 className="text-4xl leading-[1.05] font-extrabold tracking-[-0.03em] sm:text-[44px]">
            Tu pedido
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {unitsLabel(units)}
          </p>
        </div>

        <ol
          aria-label="Pasos"
          className="grid grid-cols-3 gap-2 text-xs font-semibold lg:hidden"
        >
          {steps.map((step, index) => {
            const isCurrent = index === 1;
            const isDone = index < 1;
            return (
              <li
                key={step}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1.5 text-center",
                  isCurrent ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border text-xs font-bold",
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : isDone
                        ? "border-input bg-muted"
                        : "border-input",
                  )}
                >
                  {isDone ? <Check className="size-3.5" /> : index + 1}
                </span>
                {step}
              </li>
            );
          })}
        </ol>

        <PriceChangeAlert changes={changes} onDiscard={discardChanges} />

        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <CartItemRow key={item.variantId} item={item} />
          ))}
        </div>

        <p className="rounded border border-dashed border-input px-4 py-3.5 text-[15px]">
          ¿Primera vez con decants?{" "}
          <Link
            href="/presentaciones"
            className="font-semibold underline underline-offset-2"
          >
            Mirá qué te conviene
          </Link>
          .
        </p>
      </div>

      <aside className="flex h-fit min-w-0 flex-col gap-4 rounded border bg-card p-5 sm:p-6 lg:sticky lg:top-24">
        <h2 className="text-[22px] font-bold">Mandanos el pedido</h2>
        <p className="text-[15px] leading-snug text-muted-foreground">
          Solo necesitamos tu nombre y un teléfono. Pago y entrega los
          coordinamos en el chat.
        </p>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="checkout-customer-name">Nombre y apellido</Label>
            <Input
              id="checkout-customer-name"
              placeholder="Cómo te llamás"
              autoComplete="name"
              maxLength={120}
              className="h-auto py-3.5 text-base"
              aria-invalid={!!formState.errors.customerName}
              aria-required="true"
              aria-describedby={
                formState.errors.customerName
                  ? "checkout-customer-name-error"
                  : undefined
              }
              {...register("customerName")}
            />
            {formState.errors.customerName ? (
              <p
                id="checkout-customer-name-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {formState.errors.customerName.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="checkout-customer-phone">Tu WhatsApp</Label>
            <div className="flex items-stretch overflow-hidden rounded border border-input has-[[aria-invalid=true]]:border-destructive">
              <span className="flex items-center border-r border-input bg-muted px-3 text-sm font-semibold whitespace-nowrap text-foreground sm:px-4">
                {PHONE_PREFIX}
              </span>
              <Input
                id="checkout-customer-phone"
                type="tel"
                placeholder="223 123 4567"
                autoComplete="tel-national"
                inputMode="tel"
                maxLength={20}
                className="h-auto border-0 py-3.5 text-base"
                aria-invalid={!!formState.errors.customerPhone}
                aria-required="true"
                aria-describedby={
                  formState.errors.customerPhone
                    ? "checkout-customer-phone-error"
                    : "checkout-customer-phone-help"
                }
                {...register("customerPhone")}
              />
            </div>
            {formState.errors.customerPhone ? (
              <p
                id="checkout-customer-phone-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {formState.errors.customerPhone.message}
              </p>
            ) : (
              <p
                id="checkout-customer-phone-help"
                className="text-sm text-muted-foreground"
              >
                Lo usamos solo para coordinar este pedido.
              </p>
            )}
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
        </form>

        <div className="flex flex-col gap-1.5 border-t pt-4 text-[15px]">
          <div className="flex justify-between">
            <span>{unitsLabel(units)}</span>
            <span>{formatArsPrice(total.toFixed(2))}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Envío</span>
            <span>A coordinar</span>
          </div>
        </div>

        {/* Below lg the bar is sticky to the viewport bottom but stays inside the
            aside and last in visual order, so at scroll end it rests above the
            footer instead of covering it (a fixed bar would). */}
        <div className="flex flex-col gap-2.5 max-lg:sticky max-lg:bottom-0 max-lg:z-40 max-lg:order-last max-lg:-mx-5 max-lg:-mb-5 max-lg:border-t max-lg:bg-card max-lg:px-5 max-lg:pt-3 max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:max-lg:-mx-6 sm:max-lg:-mb-6 sm:max-lg:px-6">
          <div className="flex items-baseline justify-between">
            <span className="text-base font-bold">Total</span>
            <span className="text-xl font-bold lg:text-2xl">
              {formatArsPrice(total.toFixed(2))}
            </span>
          </div>
          <Button
            type="button"
            onClick={handleSubmitClick}
            disabled={!canSubmit || isSubmitting}
            className="h-auto min-h-14 gap-3 bg-whatsapp py-4 text-base font-semibold text-whatsapp-foreground hover:bg-whatsapp/90"
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
          <p className="text-center text-[13px] text-muted-foreground">
            No se cobra nada ahora. Se abre WhatsApp con el pedido escrito.
          </p>
        </div>

        <ul className="flex flex-col gap-2 text-sm">
          {[
            "No pagás nada ahora.",
            ...(shippingInfo ? [shippingInfo] : []),
            "Todos los productos son originales.",
          ].map((text) => (
            <li key={text} className="flex items-start gap-2">
              <Check
                className="mt-0.5 size-4 shrink-0 text-success-foreground"
                aria-hidden
              />
              {text}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
