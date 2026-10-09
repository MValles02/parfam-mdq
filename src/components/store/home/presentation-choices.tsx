import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { KIND_SHORTCUTS } from "@/lib/store/catalog-shortcuts";
import { FOCUS_VISIBLE, cn } from "@/lib/utils";

const [DECANT, FULL_BOTTLE] = KIND_SHORTCUTS;

const CHOICES = [
  {
    name: "Decant",
    description: "Unos ml del frasco original. Ideal para probar.",
    href: DECANT.href,
  },
  {
    name: "Frasco entero",
    description: "Sellado, en su caja. Para regalar o regalarte.",
    href: FULL_BOTTLE.href,
  },
];

/** Home section that routes visitors to the decant or full-bottle catalog. */
export function PresentationChoices() {
  return (
    <section
      aria-labelledby="presentation-choices-title"
      className="mx-auto max-w-page px-4 pt-10 lg:px-16 lg:pt-14"
    >
      <h2
        id="presentation-choices-title"
        className="text-xl font-bold lg:text-2xl"
      >
        Elegí cómo llevarlo
      </h2>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {CHOICES.map((choice) => (
          <Link
            key={choice.name}
            href={choice.href}
            className={cn(
              "flex min-h-[72px] items-center justify-between gap-4 rounded border border-input bg-card px-4 py-3 hover:bg-muted",
              FOCUS_VISIBLE,
            )}
          >
            <span className="flex flex-col gap-1">
              <span className="font-bold">{choice.name}</span>
              <span className="text-sm text-muted-foreground">
                {choice.description}
              </span>
            </span>
            <ChevronRight aria-hidden className="size-5 shrink-0" />
          </Link>
        ))}
        <Link
          href="/presentaciones"
          className={cn(
            "flex min-h-[72px] items-center justify-center rounded border border-dashed border-input px-4 py-3 text-center text-sm font-medium hover:bg-muted",
            FOCUS_VISIBLE,
          )}
        >
          ¿Frasco o decant? Cuál te conviene →
        </Link>
      </div>
    </section>
  );
}
