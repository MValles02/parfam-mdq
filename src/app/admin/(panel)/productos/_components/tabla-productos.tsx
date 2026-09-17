import Image from "next/image";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { precioArs } from "@/lib/catalogo";
import { hace } from "@/lib/fecha";
import type { FilaProducto } from "@/lib/admin/productos";
import { EstadoChip, MenuAcciones } from "./fila-acciones";

function Miniatura({ imagen, alt }: { imagen: string | null; alt: string }) {
  if (imagen) {
    return (
      <div className="h-[58px] w-12 overflow-hidden rounded-sm border border-border bg-muted">
        <Image
          src={imagen}
          alt={alt}
          width={48}
          height={58}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex h-[58px] w-12 items-center justify-center rounded-sm border border-border bg-background">
      <svg
        width="26"
        height="42"
        viewBox="0 0 120 190"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="44"
          y="6"
          width="32"
          height="26"
          rx="3"
          className="fill-border"
        />
        <rect
          x="18"
          y="46"
          width="84"
          height="134"
          rx="4"
          className="fill-muted stroke-border"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}

function textoVariantes(variantes: number, variantesActivas: number) {
  const total = `${variantes} ${variantes === 1 ? "variante" : "variantes"}`;
  if (variantesActivas === variantes) return total;
  return `${total} · ${variantesActivas} ${variantesActivas === 1 ? "activa" : "activas"}`;
}

export function TablaProductos({ filas }: { filas: FilaProducto[] }) {
  return (
    <div className="overflow-hidden rounded border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60 hover:bg-muted/60">
            <TableHead className="w-16"></TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Producto
            </TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Estado
            </TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Variantes
            </TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Desde
            </TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Actualizado
            </TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((fila) => (
            <TableRow key={fila.id}>
              <TableCell>
                <Miniatura
                  imagen={fila.imagen?.url ?? null}
                  alt={fila.imagen?.alt ?? fila.name}
                />
              </TableCell>
              <TableCell>
                <Link
                  href={`/admin/productos/${fila.id}`}
                  className="flex flex-col gap-0.5"
                >
                  <span className="text-sm font-semibold tracking-tight text-foreground">
                    {fila.name}
                  </span>
                  <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    {fila.brandName}
                  </span>
                </Link>
              </TableCell>
              <TableCell>
                <EstadoChip
                  id={fila.id}
                  publicado={fila.status === "PUBLISHED"}
                />
              </TableCell>
              <TableCell className="text-sm text-foreground">
                {textoVariantes(fila.variantes, fila.variantesActivas)}
              </TableCell>
              <TableCell className="text-sm font-semibold text-foreground">
                {fila.desde ? precioArs(fila.desde) : "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {hace(fila.updatedAt)}
              </TableCell>
              <TableCell>
                <MenuAcciones id={fila.id} nombre={fila.name} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
