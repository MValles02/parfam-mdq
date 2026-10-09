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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  changeProductStatus,
  duplicateProduct,
  deleteProduct,
} from "../actions";
import { getAdminProductPath } from "../paths";

/**
 * The status chip, publish switch and action menu render in non-adjacent table
 * columns, so they remain separate components in this file.
 */

export function StatusChip({ isPublished }: { isPublished: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-semibold",
        isPublished
          ? "border-success-border bg-success text-success-foreground"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          isPublished ? "bg-success-foreground" : "bg-muted-foreground/60",
        )}
      />
      {isPublished ? "Publicado" : "Borrador"}
    </span>
  );
}

export function VisibleSwitch({
  id,
  name,
  isPublished,
}: {
  id: string;
  name: string;
  isPublished: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggleStatus() {
    startTransition(async () => {
      const result = await changeProductStatus(id, !isPublished);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Switch
      checked={isPublished}
      onCheckedChange={toggleStatus}
      disabled={isPending}
      aria-label={`Visible en la tienda: ${name}`}
    />
  );
}

export function ActionMenu({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [isDuplicating, startDuplicating] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] =
    useState(false);

  function duplicate() {
    startDuplicating(async () => {
      const result = await duplicateProduct(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Producto duplicado.");
      router.push(getAdminProductPath(result.data.id));
    });
  }

  function deleteCurrentProduct() {
    startDeleting(async () => {
      const result = await deleteProduct(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setIsDeleteConfirmationOpen(false);
      toast.success("Producto eliminado.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <Button variant="outline" size="icon" asChild>
          <Link href={getAdminProductPath(id)} aria-label={`Editar ${name}`}>
            <Pencil />
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label={`Más acciones para ${name}`}
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={getAdminProductPath(id)}>
                <Pencil /> Editar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isDuplicating} onSelect={duplicate}>
              <Copy /> Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setIsDeleteConfirmationOpen(true)}
            >
              <Trash2 /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog
        open={isDeleteConfirmationOpen}
        onOpenChange={setIsDeleteConfirmationOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar &ldquo;{name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El producto se va a borrar del
              catálogo; los pedidos ya hechos con él no se ven afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                deleteCurrentProduct();
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
