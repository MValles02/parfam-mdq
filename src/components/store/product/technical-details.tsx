import type { ReactNode } from "react";
import Link from "next/link";
import type {
  Concentration,
  Gender,
  Occasion,
  Season,
} from "@/generated/prisma/enums";
import {
  CONCENTRATION_LABELS,
  SEASON_LABELS,
  GENDER_LABELS,
  OCCASION_LABELS,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";

type ProductDetails = {
  brandName: string;
  brandSlug: string;
  perfumers: string[];
  year: number | null;
  concentration: Concentration | null;
  gender: Gender | null;
  seasons: Season[];
  occasions: Occasion[];
};

/**
 * Omits missing data rows because products may not have perfumers, years, or
 * seasons.
 */
export function TechnicalDetails(product: ProductDetails) {
  const rows: { label: string; value: ReactNode }[] = [
    {
      label: "Marca",
      value: (
        <Link
          href={`/marca/${product.brandSlug}`}
          className="hover:text-muted-foreground"
        >
          {product.brandName}
        </Link>
      ),
    },
    ...(product.perfumers.length > 0
      ? [{ label: "Perfumista", value: product.perfumers.join(", ") }]
      : []),
    ...(product.year
      ? [{ label: "Año de lanzamiento", value: String(product.year) }]
      : []),
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
    ...(product.seasons.length > 0
      ? [
          {
            label: "Estaciones",
            value: product.seasons
              .map((season) => SEASON_LABELS[season])
              .join(", "),
          },
        ]
      : []),
    ...(product.occasions.length > 0
      ? [
          {
            label: "Ocasiones",
            value: product.occasions
              .map((occasion) => OCCASION_LABELS[occasion])
              .join(", "),
          },
        ]
      : []),
  ];

  return (
    <div className="rounded border bg-card p-[30px]">
      <h2 className="text-xl font-bold tracking-[-0.015em]">Ficha técnica</h2>
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
    </div>
  );
}
