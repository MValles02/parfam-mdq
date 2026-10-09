import Link from "next/link";
import { FOCUS_VISIBLE, cn } from "@/lib/utils";

const STEPS = [
  "Armás tu carrito con frascos o decants.",
  "Lo mandás por WhatsApp con un número de pedido.",
  "Coordinamos pago y entrega en Mar del Plata, o retirás.",
];

/** Home section explaining the WhatsApp checkout. */
export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-title"
      className="mt-10 border-y border-border bg-card lg:mt-14"
    >
      <div className="mx-auto grid max-w-page gap-6 px-4 py-8 lg:grid-cols-4 lg:gap-8 lg:px-16 lg:py-10">
        <h2 id="how-it-works-title" className="text-xl font-bold lg:text-2xl">
          Comprás en 3 pasos, sin pagar online
        </h2>
        <ol className="contents">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3 lg:flex-col">
              <span className="text-xl font-bold lg:text-2xl">{index + 1}</span>
              <span className="text-sm text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
        <Link
          href="/como-comprar"
          className={cn(
            "flex min-h-11 items-center text-sm font-medium underline underline-offset-4 lg:col-span-4",
            FOCUS_VISIBLE,
          )}
        >
          Cómo comprar →
        </Link>
      </div>
    </section>
  );
}
