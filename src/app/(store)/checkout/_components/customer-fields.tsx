import type { Ref } from "react";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CUSTOMER_NAME_MAX_LENGTH,
  PHONE_PREFIX,
} from "@/lib/validations/checkout";

type FieldProps<Name extends string> = {
  registration: UseFormRegisterReturn<Name>;
  error: FieldError | undefined;
};

export function CustomerNameField({
  registration,
  error,
}: FieldProps<"customerName">) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="checkout-customer-name">Nombre y apellido</Label>
      <Input
        id="checkout-customer-name"
        placeholder="Cómo te llamás"
        autoComplete="name"
        maxLength={CUSTOMER_NAME_MAX_LENGTH}
        className="h-auto py-3.5 text-base"
        aria-invalid={!!error}
        aria-required="true"
        aria-describedby={error ? "checkout-customer-name-error" : undefined}
        {...registration}
      />
      {error ? (
        <p
          id="checkout-customer-name-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {error.message}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Local number input behind the fixed `PHONE_PREFIX`; its description points
 * at the error when there is one and at the help text otherwise.
 */
export function CustomerPhoneField({
  registration,
  error,
}: FieldProps<"customerPhone">) {
  return (
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
          aria-invalid={!!error}
          aria-required="true"
          aria-describedby={
            error
              ? "checkout-customer-phone-error"
              : "checkout-customer-phone-help"
          }
          {...registration}
        />
      </div>
      {error ? (
        <p
          id="checkout-customer-phone-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {error.message}
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
  );
}

/**
 * Honeypot: hidden from people and visible to bots that complete every input.
 * It avoids `hidden`, which some bots intentionally skip, and is positioned
 * offscreen instead. The form reads it through `ref`, outside react-hook-form.
 */
export function HoneypotField({ ref }: { ref: Ref<HTMLInputElement> }) {
  return (
    <div className="absolute -left-[9999px]" aria-hidden="true" tabIndex={-1}>
      <label htmlFor="checkout-company">Empresa</label>
      <input
        id="checkout-company"
        name="company"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        ref={ref}
      />
    </div>
  );
}
