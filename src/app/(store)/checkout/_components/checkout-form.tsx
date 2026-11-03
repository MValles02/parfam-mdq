"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import Link from "next/link";
import { Check, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PriceChangeAlert } from "@/components/store/cart/price-change-alert";
import { CartItemRow } from "@/components/store/cart/cart-item-row";
import { EmptyCart } from "@/components/store/cart/cart-item-list";
import { formatArsPrice } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import {
  cartSubtotal,
  cartUnits,
  unitsLabel,
  useCart,
  useHydrated,
} from "@/lib/cart";
import { useCartReconciliation } from "@/lib/store/use-cart-reconciliation";
import {
  checkoutCustomerSchema,
  withPhonePrefix,
  type CheckoutCustomerInput,
} from "@/lib/validations/checkout";
import { whatsAppLinkStorageKey } from "@/lib/whatsapp";
import { createOrder } from "../actions";
import {
  CustomerNameField,
  CustomerPhoneField,
  HoneypotField,
} from "./customer-fields";

type CheckoutFailure = Extract<
  Awaited<ReturnType<typeof createOrder>>,
  { ok: false }
>;

type CustomerField = keyof CheckoutCustomerInput;

/**
 * Server field errors the form can show inline, in response order. Errors for
 * other fields (such as `items`) have no input and fall back to a toast.
 */
function customerFieldErrors(
  fieldErrors: CheckoutFailure["fieldErrors"] = {},
): [CustomerField, string][] {
  const errors: [CustomerField, string][] = [];
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (field === "customerName" || field === "customerPhone") {
      errors.push([field, messages[0]]);
    }
  }
  return errors;
}

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

  const canSubmit = changes.length === 0 && !isChecking;

  const units = cartUnits(items);
  const total = cartSubtotal(items);

  function showFailure({
    message,
    fieldErrors,
    invalidItems,
  }: CheckoutFailure) {
    for (const invalidItem of invalidItems ?? []) {
      remove(invalidItem.variantId);
    }
    // Field errors render inline and move focus to the field; the toast is
    // reserved for errors that have no field (stock, network, etc.).
    const inlineErrors = customerFieldErrors(fieldErrors);
    inlineErrors.forEach(([field, fieldMessage], index) => {
      setError(field, { message: fieldMessage }, { shouldFocus: index === 0 });
    });
    if (inlineErrors.length === 0) toast.error(message);
  }

  function showThanks(orderNumber: string, link: string) {
    // The link embeds the customer's name and order contents, so it travels
    // via sessionStorage instead of the URL (history, logs, Referer).
    // `_customer-thanks.tsx` reads the same key.
    try {
      sessionStorage.setItem(whatsAppLinkStorageKey(orderNumber), link);
    } catch {
      // Storage unavailable: the thank-you page shows its generic fallback.
    }
    router.push(`/pedido/${orderNumber}/gracias`);
  }

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
            customerPhone: withPhonePrefix(values.customerPhone),
            items: items.map((i) => ({
              variantId: i.variantId,
              qty: i.qty,
            })),
            company: honeypotRef.current?.value ?? "",
          });

          if (!result.ok) {
            popup?.close();
            showFailure(result);
            return;
          }

          if (popup) {
            popup.location.href = result.link;
          }
          showThanks(result.orderNumber, result.link);
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
          <CustomerNameField
            registration={register("customerName")}
            error={formState.errors.customerName}
          />
          <CustomerPhoneField
            registration={register("customerPhone")}
            error={formState.errors.customerPhone}
          />
          <HoneypotField ref={honeypotRef} />
        </form>

        <div className="flex flex-col gap-1.5 border-t pt-4 text-[15px]">
          <div className="flex justify-between">
            <span>{unitsLabel(units)}</span>
            <span>{formatArsPrice(total)}</span>
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
              {formatArsPrice(total)}
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
