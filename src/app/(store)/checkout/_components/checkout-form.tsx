"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
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

  const { register, handleSubmit, formState, setError, getValues } =
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

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:gap-14">
      <div className="flex max-w-[680px] flex-col gap-8">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
            Último paso
          </p>
          <h1 className="mt-2.5 text-4xl leading-[1.05] font-extrabold tracking-[-0.03em] sm:text-[44px]">
            ¿A nombre de quién armamos el pedido?
          </h1>
          <p className="mt-3.5 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
            Con esto generamos el pedido y abrimos WhatsApp con todo escrito. No
            pedimos datos de pago: envío o retiro y cómo pagás lo arreglás por
            chat.
          </p>
        </div>

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
              maxLength={120}
              className="h-auto py-4 text-base"
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
            <Label
              htmlFor="checkout-customer-phone"
              className="text-xs uppercase"
            >
              Tu teléfono
            </Label>
            <div className="flex items-stretch overflow-hidden rounded-lg border border-input has-[[aria-invalid=true]]:border-destructive">
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
                className="h-auto border-0 py-4 text-base"
                aria-invalid={!!formState.errors.customerPhone}
                aria-required="true"
                aria-describedby="checkout-customer-phone-help"
                {...register("customerPhone")}
              />
            </div>
            {formState.errors.customerPhone ? (
              <p
                id="checkout-customer-phone-help"
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
                Por si se corta el chat y tenemos que escribirte.
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

          <div className="flex items-baseline justify-between lg:hidden">
            <span className="text-sm text-muted-foreground">
              Total · {unitsLabel(units)}
            </span>
            <span className="text-xl font-extrabold tracking-[-0.03em]">
              {formatArsPrice(total.toFixed(2))}
            </span>
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
            {unitsLabel(units)}
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

        <ul className="flex flex-col gap-3 text-sm leading-relaxed text-foreground/90">
          <li>{shippingInfo}</li>
          <li>Todos los productos son originales.</li>
          <li>Guardamos el pedido con un número para seguirlo por chat.</li>
        </ul>
      </div>
    </div>
  );
}
