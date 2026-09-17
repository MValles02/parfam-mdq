import type { ReactNode } from "react";
import Link from "next/link";
import type {
  Concentration,
  Gender,
  Occasion,
  Season,
} from "@/generated/prisma/enums";
import { CONCENTRACION, ESTACION, GENERO, OCASION } from "@/lib/catalogo";
import { cn } from "@/lib/utils";

type Props = {
  marca: string;
  marcaSlug: string;
  perfumistas: string[];
  anio: number | null;
  concentracion: Concentration | null;
  genero: Gender | null;
  estaciones: Season[];
  ocasiones: Occasion[];
};

/**
 * Ficha tecnica (design/Producto.dc.html). Las filas cuyo dato no esta
 * cargado se saltean en vez de mostrar un "—": no todos los productos tienen
 * perfumista, año o estaciones cargadas.
 */
export function FichaTecnica(producto: Props) {
  const filas: { label: string; valor: ReactNode }[] = [
    {
      label: "Marca",
      valor: (
        <Link
          href={`/marca/${producto.marcaSlug}`}
          className="hover:text-muted-foreground"
        >
          {producto.marca}
        </Link>
      ),
    },
    ...(producto.perfumistas.length > 0
      ? [{ label: "Perfumista", valor: producto.perfumistas.join(", ") }]
      : []),
    ...(producto.anio
      ? [{ label: "Año de lanzamiento", valor: String(producto.anio) }]
      : []),
    ...(producto.concentracion
      ? [
          {
            label: "Concentración",
            valor: CONCENTRACION[producto.concentracion],
          },
        ]
      : []),
    ...(producto.genero
      ? [{ label: "Género", valor: GENERO[producto.genero] }]
      : []),
    ...(producto.estaciones.length > 0
      ? [
          {
            label: "Estaciones",
            valor: producto.estaciones.map((s) => ESTACION[s]).join(", "),
          },
        ]
      : []),
    ...(producto.ocasiones.length > 0
      ? [
          {
            label: "Ocasiones",
            valor: producto.ocasiones.map((o) => OCASION[o]).join(", "),
          },
        ]
      : []),
  ];

  return (
    <div className="rounded border bg-card p-[30px]">
      <h2 className="text-xl font-bold tracking-[-0.015em]">Ficha técnica</h2>
      <dl className="mt-5 flex flex-col">
        {filas.map((fila, indice) => (
          <div
            key={fila.label}
            className={cn(
              "flex items-center justify-between py-3.5",
              indice < filas.length - 1 ? "border-b" : "",
            )}
          >
            <dt className="text-[13px] text-muted-foreground">{fila.label}</dt>
            <dd className="text-sm font-semibold">{fila.valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
