"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/admin/field";
import { setServerFieldErrors } from "@/components/admin/server-field-errors";
import type { EditableSettings } from "@/lib/admin/settings";
import { buildOrderMessage } from "@/lib/store/order-message";
import {
  settingsSchema,
  type SettingsFormInput,
  type SettingsFormValues,
} from "@/lib/validations/settings";
import { saveSettings } from "../actions";

/** Without either of these, the WhatsApp message omits the order detail. */
const ITEMS_PLACEHOLDER = "{{items}}";
const TOTAL_PLACEHOLDER = "{{total}}";

const PLACEHOLDERS = [
  ["{{marca}}", "Nombre de la marca"],
  [ITEMS_PLACEHOLDER, "Cada producto del pedido, uno por línea"],
  [TOTAL_PLACEHOLDER, "Total del pedido"],
  ["{{nombre}}", "Nombre del cliente"],
  ["{{numero}}", "Número de pedido, ej. PM-0001"],
] as const;

const SAMPLE_ITEMS = [
  {
    brandName: "Casa Ejemplo",
    productName: "Eau de Prueba",
    variantLabel: "Decant 10 ml",
    qty: 2,
    subtotalArs: "24000",
  },
  {
    brandName: "Casa Ejemplo",
    productName: "Noche Clara",
    variantLabel: "Frasco entero",
    qty: 1,
    subtotalArs: "98000",
  },
];

export function SettingsForm({
  settings,
  brandName,
  siteHost,
}: {
  settings: EditableSettings;
  brandName: string;
  siteHost: string;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [isSaved, setIsSaved] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState,
    setError,
    setValue,
    getValues,
    reset,
  } = useForm<SettingsFormInput, unknown, SettingsFormValues>({
    resolver: standardSchemaResolver(settingsSchema),
    defaultValues: settings,
    mode: "onSubmit",
  });

  const [messageTemplate, whatsappNumber, seoTitle, seoDescription] = useWatch({
    control,
    name: [
      "whatsappMessageTemplate",
      "whatsappNumber",
      "seoDefaultTitle",
      "seoDefaultDescription",
    ],
  });
  const title = seoTitle ?? "";
  const description = seoDescription ?? "";
  const isMissingOrderDetail =
    !(messageTemplate ?? "").includes(ITEMS_PLACEHOLDER) &&
    !(messageTemplate ?? "").includes(TOTAL_PLACEHOLDER);

  const preview = buildOrderMessage({
    template: messageTemplate ?? "",
    brand: brandName,
    customerName: "Lucía Pérez",
    orderNumber: "PM-0046",
    items: SAMPLE_ITEMS,
    totalArs: "122000",
  });

  function submit(values: SettingsFormValues) {
    startSaving(async () => {
      const result = await saveSettings(values);
      if (!result.ok) {
        setServerFieldErrors(setError, result.fieldErrors);
        toast.error(result.message);
        return;
      }
      toast.success("Configuración guardada.");
      reset(getValues());
      setIsSaved(true);
      router.refresh();
    });
  }

  function appendToken(tag: string) {
    setValue(
      "whatsappMessageTemplate",
      `${getValues("whatsappMessageTemplate") ?? ""}${tag}`,
      {
        shouldDirty: true,
      },
    );
  }

  const errors = formState.errors;

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="flex flex-col gap-5 rounded border border-border bg-card p-5">
            <h2 className="text-sm font-bold tracking-[-0.01em]">WhatsApp</h2>

            <Field
              label="Número"
              htmlFor="whatsappNumber"
              error={errors.whatsappNumber?.message}
              hint="Con código de país y de área, ej. +54 9 223 616 3910."
            >
              <Input
                id="whatsappNumber"
                autoComplete="tel"
                aria-invalid={!!errors.whatsappNumber}
                {...register("whatsappNumber")}
              />
            </Field>

            <Field
              label="Plantilla del mensaje"
              htmlFor="whatsappMessageTemplate"
              error={errors.whatsappMessageTemplate?.message}
            >
              <Textarea
                id="whatsappMessageTemplate"
                rows={8}
                className="font-mono text-sm"
                aria-invalid={!!errors.whatsappMessageTemplate}
                {...register("whatsappMessageTemplate")}
              />
            </Field>

            <div className="rounded-md border bg-muted/40 p-3.5 text-xs text-muted-foreground">
              <p className="mb-2 font-semibold text-foreground">
                Variables disponibles (tocá una para agregarla)
              </p>
              <ul className="flex flex-col gap-1">
                {PLACEHOLDERS.map(([tag, desc]) => (
                  <li key={tag} className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => appendToken(tag)}
                      className="rounded border border-border bg-card px-1.5 py-0.5 font-mono font-semibold text-foreground hover:bg-muted"
                    >
                      {tag}
                    </button>
                    <span>{desc}</span>
                  </li>
                ))}
              </ul>
            </div>

            {isMissingOrderDetail ? (
              <Alert>
                <AlertTitle>
                  La plantilla no tiene {ITEMS_PLACEHOLDER} ni{" "}
                  {TOTAL_PLACEHOLDER}
                </AlertTitle>
                <AlertDescription>
                  El pedido se crea igual, pero el mensaje de WhatsApp no va a
                  mostrar el detalle. Si fue sin querer, agregalos de nuevo.
                </AlertDescription>
              </Alert>
            ) : null}
          </section>

          <section className="flex flex-col gap-5 rounded border border-border bg-card p-5">
            <h2 className="text-sm font-bold tracking-[-0.01em]">
              Redes sociales
            </h2>

            <Field
              label="Instagram"
              htmlFor="instagramHandle"
              error={errors.instagramHandle?.message}
              hint="Sin arroba, ej. parfam_mdq"
            >
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>@</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="instagramHandle"
                  aria-invalid={!!errors.instagramHandle}
                  {...register("instagramHandle")}
                />
              </InputGroup>
            </Field>
          </section>

          <section className="flex flex-col gap-5 rounded border border-border bg-card p-5">
            <h2 className="text-sm font-bold tracking-[-0.01em]">Tienda</h2>

            <Field
              label="Info de envío"
              htmlFor="shippingInfo"
              error={errors.shippingInfo?.message}
              hint="Se muestra en el checkout, Cómo comprar, Contacto y la pantalla de gracias."
            >
              <Textarea
                id="shippingInfo"
                rows={2}
                aria-invalid={!!errors.shippingInfo}
                {...register("shippingInfo")}
              />
            </Field>
          </section>

          <section className="flex flex-col gap-5 rounded border border-border bg-card p-5">
            <h2 className="text-sm font-bold tracking-[-0.01em]">SEO</h2>

            <Field
              label="Título por defecto"
              htmlFor="seoDefaultTitle"
              error={errors.seoDefaultTitle?.message}
              hint={`${title.length}/70 · El que usan Google y las redes en cualquier página que no defina uno propio.`}
            >
              <Input
                id="seoDefaultTitle"
                aria-invalid={!!errors.seoDefaultTitle}
                {...register("seoDefaultTitle")}
              />
            </Field>

            <Field
              label="Descripción por defecto"
              htmlFor="seoDefaultDescription"
              error={errors.seoDefaultDescription?.message}
              hint={`${description.length}/180`}
            >
              <Textarea
                id="seoDefaultDescription"
                rows={3}
                aria-invalid={!!errors.seoDefaultDescription}
                {...register("seoDefaultDescription")}
              />
            </Field>

            <div className="flex flex-col gap-0.5 rounded-md border bg-muted/40 p-3.5">
              <span className="text-xs text-muted-foreground">{siteHost}</span>
              <span className="text-base font-medium break-words text-foreground">
                {title || "Sin título"}
              </span>
              <span className="text-sm break-words text-muted-foreground">
                {description || "Sin descripción"}
              </span>
            </div>
          </section>
        </div>

        <aside
          aria-label="Vista previa del mensaje"
          className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-6 lg:self-start"
        >
          <h2 className="text-sm font-bold tracking-[-0.01em]">
            Así lo recibís
          </h2>
          <div className="rounded border border-border bg-card p-4">
            <p
              data-testid="whatsapp-preview"
              className="rounded-md border border-success-border bg-success p-3 text-sm break-words whitespace-pre-wrap text-success-foreground"
            >
              {preview}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              a wa.me/{(whatsappNumber ?? "").replace(/\D/g, "")}
            </p>
          </div>
        </aside>
      </div>

      {formState.isDirty ? (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-card p-3 shadow-sm">
          <span className="text-sm text-muted-foreground">
            Cambios sin guardar
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => reset(settings)}
            >
              Descartar
            </Button>
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Guardar
            </Button>
          </div>
        </div>
      ) : isSaved ? (
        <p role="status" className="text-sm text-success-foreground">
          Guardado
        </p>
      ) : null}
    </form>
  );
}
