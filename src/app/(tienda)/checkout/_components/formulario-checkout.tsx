"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { precioArs } from "@/lib/catalogo";
import { useCarrito, useHidratado } from "@/lib/carrito";
import { useReconciliacionCarrito } from "@/lib/tienda/usar-reconciliacion-carrito";
import {
  checkoutClienteSchema,
  type CheckoutClienteInput,
} from "@/lib/validations/checkout";
import { crearPedido } from "../actions";

/**
 * Prefijo fijo del telefono (design/Checkout.dc.html): el cliente sólo
 * tipea el numero local, nunca el codigo de pais ni el "9" de celular. Eso
 * hace que la validacion sea mucho menos ambigua que tratar de adivinar si
 * escribió "0223 15…" o "223…".
 */
const PREFIJO = "+54 9";

/**
 * El paso final del checkout (design/Checkout.dc.html). El honeypot es un
 * `useRef` sin pasar por react-hook-form ni por `checkoutSchema` a propósito:
 * si viniera con validación normal, un error de zod en un campo que el
 * usuario nunca ve sería una pista rara en el formState. Se lee a mano al
 * enviar.
 */
export function FormularioCheckout({
  shippingInfo,
}: {
  /** `SiteSetting.shippingInfo`, ya resuelto por el server component padre
   * (con fallback si el admin no cargó nada, ver `obtenerConfiguracionSitio`). */
  shippingInfo: string;
}) {
  const router = useRouter();
  const hidratado = useHidratado();
  const items = useCarrito((estado) => estado.items);
  const quitar = useCarrito((estado) => estado.quitar);
  const { cambios, descartarCambios, verificando } = useReconciliacionCarrito();
  const [enviando, iniciarEnvio] = useTransition();
  const honeypotRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState, setError } =
    useForm<CheckoutClienteInput>({
      resolver: standardSchemaResolver(checkoutClienteSchema),
      defaultValues: { nombre: "", telefono: "" },
      mode: "onSubmit",
    });

  if (!hidratado) return null;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded border border-dashed p-16 text-center">
        <p className="text-sm text-muted-foreground">
          Todavía no agregaste nada al carrito.
        </p>
        <Button asChild>
          <Link href="/catalogo">Ir al catálogo</Link>
        </Button>
      </div>
    );
  }

  const total = items.reduce(
    (acc, i) => acc + Number(i.unitPriceArs) * i.qty,
    0,
  );
  const puedeEnviar = cambios.length === 0 && !verificando;

  function alEnviarClick() {
    // El popup se abre acá, sincrónico con el click: si se abre después de
    // un `await`, Safari y Chrome en modo estricto lo bloquean. Arranca en
    // blanco y recién le ponemos destino cuando vuelve la Server Action.
    const popup = window.open("", "_blank");

    void handleSubmit(
      (valores) => {
        iniciarEnvio(async () => {
          const resultado = await crearPedido({
            nombre: valores.nombre,
            telefono: `${PREFIJO} ${valores.telefono}`,
            items: items.map((i) => ({
              variantId: i.variantId,
              qty: i.qty,
            })),
            empresa: honeypotRef.current?.value ?? "",
          });

          if (!resultado.ok) {
            popup?.close();
            if (resultado.invalidos) {
              for (const inv of resultado.invalidos) quitar(inv.variantId);
            }
            // Errores por campo (ej. "no parece un número argentino
            // válido"): la validación real del teléfono es del servidor, no
            // de este formulario (ver el comentario en checkoutClienteSchema).
            for (const [campo, mensajes] of Object.entries(
              resultado.errores ?? {},
            )) {
              if (campo === "nombre" || campo === "telefono") {
                setError(campo, { message: mensajes[0] });
              }
            }
            toast.error(resultado.mensaje);
            return;
          }

          if (popup) {
            popup.location.href = resultado.link;
          }
          router.push(
            `/pedido/${resultado.numero}/gracias?link=${encodeURIComponent(resultado.link)}`,
          );
        });
      },
      () => {
        // Formulario invalido: no hay a donde mandar el popup en blanco.
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

        {cambios.length > 0 ? (
          <Alert variant="destructive">
            <AlertTitle>Actualizamos algunos precios</AlertTitle>
            <AlertDescription>
              <ul className="flex flex-col gap-1">
                {cambios.map((c) => (
                  <li key={c.variantId}>
                    {c.productName} · {c.variantLabel}:{" "}
                    <span className="line-through">{precioArs(c.antes)}</span>{" "}
                    ahora {precioArs(c.ahora)}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={descartarCambios}
              >
                Entendido, continuar
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="checkout-nombre" className="text-xs uppercase">
              Tu nombre
            </Label>
            <Input
              id="checkout-nombre"
              placeholder="Nombre y apellido"
              autoComplete="name"
              className="h-auto py-4 text-base"
              aria-invalid={!!formState.errors.nombre}
              {...register("nombre")}
            />
            {formState.errors.nombre ? (
              <p className="text-xs text-destructive">
                {formState.errors.nombre.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="checkout-telefono" className="text-xs uppercase">
              Tu teléfono
            </Label>
            <div className="flex items-stretch overflow-hidden rounded-lg border border-input">
              <span className="flex items-center border-r border-input bg-muted px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground sm:px-4">
                {PREFIJO}
              </span>
              <Input
                id="checkout-telefono"
                placeholder="223 616 3910"
                autoComplete="tel-national"
                inputMode="tel"
                className="h-auto border-0 py-4 text-base"
                aria-invalid={!!formState.errors.telefono}
                {...register("telefono")}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {formState.errors.telefono?.message ??
                "Por si se corta el chat y tenemos que escribirte."}
            </p>
          </div>

          {/* Honeypot: oculto para una persona, visible para un bot que
              completa "todos los inputs". No usa `hidden` (algunos bots lo
              saltean a propósito) sino posicion fuera de pantalla. */}
          <div
            className="absolute -left-[9999px]"
            aria-hidden="true"
            tabIndex={-1}
          >
            <label htmlFor="checkout-empresa">Empresa</label>
            <input
              id="checkout-empresa"
              name="empresa"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              ref={honeypotRef}
            />
          </div>

          <Button
            type="button"
            onClick={alEnviarClick}
            disabled={!puedeEnviar || enviando}
            className="h-auto gap-3 bg-whatsapp py-[22px] text-base font-semibold text-whatsapp-foreground hover:bg-whatsapp/90"
          >
            {enviando ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <MessageCircle className="size-5" />
            )}
            {verificando
              ? "Verificando tu carrito…"
              : enviando
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
            {items.length === 1 ? "1 producto" : `${items.length} productos`}
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
                {precioArs((Number(item.unitPriceArs) * item.qty).toFixed(2))}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-[32px] font-extrabold tracking-[-0.03em]">
            {precioArs(total.toFixed(2))}
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
