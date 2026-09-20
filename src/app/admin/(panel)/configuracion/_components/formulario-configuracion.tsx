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
import { Campo } from "@/components/admin/campo";
import type { ConfiguracionEditable } from "@/lib/admin/configuracion";
import {
  configuracionSchema,
  type ConfiguracionFormInput,
  type ConfiguracionFormValues,
} from "@/lib/validations/configuracion";
import { guardarConfiguracion } from "../actions";

const PLACEHOLDERS = [
  ["{{marca}}", "Nombre de la marca"],
  ["{{items}}", "Cada producto del pedido, uno por línea"],
  ["{{total}}", "Total del pedido"],
  ["{{nombre}}", "Nombre del cliente"],
  ["{{numero}}", "Número de pedido, ej. PM-0001"],
] as const;

export function FormularioConfiguracion({
  configuracion,
}: {
  configuracion: ConfiguracionEditable;
}) {
  const router = useRouter();
  const [guardando, guardar] = useTransition();

  const { register, control, handleSubmit, formState, setError } = useForm<
    ConfiguracionFormInput,
    unknown,
    ConfiguracionFormValues
  >({
    resolver: standardSchemaResolver(configuracionSchema),
    defaultValues: configuracion,
    mode: "onSubmit",
  });

  const plantilla =
    useWatch({ control, name: "whatsappMessageTemplate" }) ?? "";
  const faltanPlaceholders =
    !plantilla.includes("{{items}}") && !plantilla.includes("{{total}}");

  function enviar(valores: ConfiguracionFormValues) {
    guardar(async () => {
      const r = await guardarConfiguracion(valores);
      if (!r.ok) {
        for (const [campo, mensajes] of Object.entries(r.errores ?? {})) {
          setError(campo as keyof ConfiguracionFormInput, {
            message: mensajes[0],
          });
        }
        toast.error(r.mensaje);
        return;
      }
      toast.success("Configuración guardada.");
      router.refresh();
    });
  }

  const errores = formState.errors;

  return (
    <form onSubmit={handleSubmit(enviar)} className="flex flex-col gap-9 pb-16">
      <section className="flex flex-col gap-5">
        <h2 className="text-sm font-bold tracking-[-0.01em]">WhatsApp</h2>

        <Campo
          label="Número"
          htmlFor="whatsappNumber"
          error={errores.whatsappNumber?.message}
          hint="Con código de país y de área, ej. +54 9 223 616 3910."
        >
          <Input
            id="whatsappNumber"
            autoComplete="tel"
            aria-invalid={!!errores.whatsappNumber}
            {...register("whatsappNumber")}
          />
        </Campo>

        <Campo
          label="Plantilla del mensaje"
          htmlFor="whatsappMessageTemplate"
          error={errores.whatsappMessageTemplate?.message}
        >
          <Textarea
            id="whatsappMessageTemplate"
            rows={8}
            className="font-mono text-sm"
            aria-invalid={!!errores.whatsappMessageTemplate}
            {...register("whatsappMessageTemplate")}
          />
        </Campo>

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

        {faltanPlaceholders ? (
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

        <Campo
          label="Instagram"
          htmlFor="instagramHandle"
          error={errores.instagramHandle?.message}
          hint="Sin arroba, ej. parfam_mdq"
        >
          <Input
            id="instagramHandle"
            aria-invalid={!!errores.instagramHandle}
            {...register("instagramHandle")}
          />
        </Campo>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-sm font-bold tracking-[-0.01em]">Tienda</h2>

        <Campo
          label="Info de envío"
          htmlFor="shippingInfo"
          error={errores.shippingInfo?.message}
          hint="Se muestra en el resumen del checkout, arriba del botón de WhatsApp."
        >
          <Textarea
            id="shippingInfo"
            rows={2}
            aria-invalid={!!errores.shippingInfo}
            {...register("shippingInfo")}
          />
        </Campo>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-sm font-bold tracking-[-0.01em]">SEO</h2>

        <Campo
          label="Título por defecto"
          htmlFor="seoDefaultTitle"
          error={errores.seoDefaultTitle?.message}
          hint="El que usan Google y las redes en cualquier página que no defina uno propio."
        >
          <Input
            id="seoDefaultTitle"
            aria-invalid={!!errores.seoDefaultTitle}
            {...register("seoDefaultTitle")}
          />
        </Campo>

        <Campo
          label="Descripción por defecto"
          htmlFor="seoDefaultDescription"
          error={errores.seoDefaultDescription?.message}
        >
          <Textarea
            id="seoDefaultDescription"
            rows={3}
            aria-invalid={!!errores.seoDefaultDescription}
            {...register("seoDefaultDescription")}
          />
        </Campo>
      </section>

      <Button type="submit" disabled={guardando} className="w-fit gap-2">
        {guardando ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        Guardar
      </Button>
    </form>
  );
}
