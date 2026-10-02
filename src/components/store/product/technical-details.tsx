import type { ReactNode } from "react";
import Link from "next/link";
import type { Concentration, Gender } from "@/generated/prisma/enums";
import { CONCENTRATION_LABELS, GENDER_LABELS } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { CollapsibleSection } from "./collapsible-section";

type ProductDetails = {
  brandName: string;
  brandSlug: string;
  collection: string | null;
  perfumers: string[];
  year: number | null;
  concentration: Concentration | null;
  gender: Gender | null;
};

/**
 * Omits missing data rows because products may not have perfumers or years.
 */
export function TechnicalDetails(product: ProductDetails) {
  const rows: { label: string; value: ReactNode }[] = [
    {
      label: "Marca",
      value: (
        <Link
          href={`/?marca=${product.brandSlug}#catalogo`}
          className="hover:text-muted-foreground"
        >
          {product.brandName}
        </Link>
      ),
    },
    ...(product.collection
      ? [{ label: "Línea", value: product.collection }]
      : []),
    ...(product.perfumers.length > 0
      ? [
          {
            label: product.perfumers.length > 1 ? "Perfumistas" : "Perfumista",
            value: product.perfumers.join(", "),
          },
        ]
      : []),
    ...(product.year ? [{ label: "Año", value: String(product.year) }] : []),
    ...(product.concentration
      ? [
          {
            label: "Concentración",
            value: CONCENTRATION_LABELS[product.concentration],
          },
        ]
      : []),
    ...(product.gender
      ? [{ label: "Género", value: GENDER_LABELS[product.gender] }]
      : []),
  ];

  return (
    <CollapsibleSection
      defaultOpenOnMobile
      className="rounded border bg-card p-[30px]"
      title={
        <h2 className="text-xl font-bold tracking-[-0.015em]">Ficha técnica</h2>
      }
    >
      <dl className="mt-5 flex flex-col">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={cn(
              "flex items-center justify-between py-3.5",
              index < rows.length - 1 ? "border-b" : "",
            )}
          >
            <dt className="text-[13px] text-muted-foreground">{row.label}</dt>
            <dd className="text-sm font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>
    </CollapsibleSection>
  );
}
