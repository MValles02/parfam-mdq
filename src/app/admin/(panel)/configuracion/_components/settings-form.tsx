"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/admin/field";
import type { EditableSettings } from "@/lib/admin/settings";
import {
  settingsSchema,
  type SettingsFormInput,
  type SettingsFormValues,
} from "@/lib/validations/settings";
import { saveSettings } from "../actions";

const PLACEHOLDERS = [
  ["{{marca}}", "Nombre de la marca"],
  ["{{items}}", "Cada producto del pedido, uno por línea"],
  ["{{total}}", "Total del pedido"],
  ["{{nombre}}", "Nombre del cliente"],
  ["{{numero}}", "Número de pedido, ej. PM-0001"],
] as const;

export function SettingsForm({ settings }: { settings: EditableSettings }) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();

  const { register, control, handleSubmit, formState, setError } = useForm<
    SettingsFormInput,
    unknown,
    SettingsFormValues
  >({
    resolver: standardSchemaResolver(settingsSchema),
    defaultValues: settings,
    mode: "onSubmit",
  });

  const messageTemplate =
    useWatch({ control, name: "whatsappMessageTemplate" }) ?? "";
  const isMissingPlaceholders =
    !messageTemplate.includes("{{items}}") &&
    !messageTemplate.includes("{{total}}");

  function submit(values: SettingsFormValues) {
    startSaving(async () => {
      const result = await saveSettings(values);
      if (!result.ok) {
        for (const [field, messages] of Object.entries(
          result.fieldErrors ?? {},
        )) {
          setError(field as keyof SettingsFormInput, {
            message: messages[0],
          });
        }
        toast.error(result.message);
        return;
      }
      toast.success("Configuración guardada.");
      router.refresh();
    });
  }

  const errors = formState.errors;

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-9 pb-16">
      <section className="flex flex-col gap-5">
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
          <p className="mb-1.5 font-semibold text-foreground">
            Placeholders disponibles
          </p>
          <ul className="flex flex-col gap-0.5">
            {PLACEHOLDERS.map(([tag, desc]) => (
              <li key={tag}>
                <code className="font-mono font-semibold text-foreground">
                  {tag}
                </code>{" "}
                — {desc}
              </li>
            ))}
          </ul>
        </div>

        {isMissingPlaceholders ? (
          <Alert>
            <AlertTitle>
              La plantilla no tiene {"{{items}}"} ni {"{{total}}"}
            </AlertTitle>
            <AlertDescription>
              El pedido se crea igual, pero el mensaje de WhatsApp no va a
              mostrar el detalle. Si fue sin querer, agregalos de nuevo.
            </AlertDescription>
          </Alert>
        ) : null}
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-sm font-bold tracking-[-0.01em]">Marca</h2>

        <Field
          label="Instagram"
          htmlFor="instagramHandle"
          error={errors.instagramHandle?.message}
          hint="Sin arroba, ej. parfam_mdq"
        >
          <Input
            id="instagramHandle"
            aria-invalid={!!errors.instagramHandle}
            {...register("instagramHandle")}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-sm font-bold tracking-[-0.01em]">Tienda</h2>

        <Field
          label="Info de envío"
          htmlFor="shippingInfo"
          error={errors.shippingInfo?.message}
          hint="Se muestra en el resumen del checkout, arriba del botón de WhatsApp."
        >
          <Textarea
            id="shippingInfo"
            rows={2}
            aria-invalid={!!errors.shippingInfo}
            {...register("shippingInfo")}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-sm font-bold tracking-[-0.01em]">SEO</h2>

        <Field
          label="Título por defecto"
          htmlFor="seoDefaultTitle"
          error={errors.seoDefaultTitle?.message}
          hint="El que usan Google y las redes en cualquier página que no defina uno propio."
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
        >
          <Textarea
            id="seoDefaultDescription"
            rows={3}
            aria-invalid={!!errors.seoDefaultDescription}
            {...register("seoDefaultDescription")}
          />
        </Field>
      </section>

      <Button type="submit" disabled={isSaving} className="w-fit gap-2">
        {isSaving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        Guardar
      </Button>
    </form>
  );
}
