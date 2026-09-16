"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  cambiarEstadoProducto,
  duplicarProducto,
  eliminarProducto,
} from "../actions";

/**
 * El chip de ESTADO y el menú de acciones son dos columnas no adyacentes de
 * la tabla (ver AdminProductos.dc.html), asi que van como dos componentes
 * separados en este archivo en vez de uno solo que no podria ocupar dos
 * <TableCell> salteados.
 */

export function EstadoChip({
  id,
  publicado,
}: {
  id: string;
  publicado: boolean;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();

  function toggle() {
    iniciar(async () => {
      const resultado = await cambiarEstadoProducto(id, !publicado);
      if (!resultado.ok) {
        toast.error(resultado.mensaje);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pendiente}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-semibold disabled:opacity-50",
        publicado
          ? "border-success-border bg-success text-success-foreground"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          publicado ? "bg-success-foreground" : "bg-muted-foreground/60",
        )}
      />
      {publicado ? "Publicado" : "Borrador"}
    </button>
  );
}

export function MenuAcciones({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter();
  const [pendienteDuplicar, iniciarDuplicar] = useTransition();
  const [pendienteEliminar, iniciarEliminar] = useTransition();
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  function duplicar() {
    iniciarDuplicar(async () => {
      const resultado = await duplicarProducto(id);
      if (!resultado.ok) {
        toast.error(resultado.mensaje);
        return;
      }
      toast.success("Producto duplicado.");
      router.push(`/admin/productos/${resultado.datos.id}`);
    });
  }

  function eliminar() {
    iniciarEliminar(async () => {
      const resultado = await eliminarProducto(id);
      if (!resultado.ok) {
        toast.error(resultado.mensaje);
        return;
      }
      setConfirmarEliminar(false);
      toast.success("Producto eliminado.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/admin/productos/${id}`} aria-label={`Editar ${nombre}`}>
            <Pencil />
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label={`Más acciones para ${nombre}`}
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/productos/${id}`}>
                <Pencil /> Editar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={pendienteDuplicar} onSelect={duplicar}>
              <Copy /> Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setConfirmarEliminar(true)}
            >
              <Trash2 /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmarEliminar} onOpenChange={setConfirmarEliminar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar &ldquo;{nombre}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El producto se va a borrar del
              catálogo; los pedidos ya hechos con él no se ven afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendienteEliminar}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pendienteEliminar}
              onClick={(e) => {
                e.preventDefault();
                eliminar();
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
