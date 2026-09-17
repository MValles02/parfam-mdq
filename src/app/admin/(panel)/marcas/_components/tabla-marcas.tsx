"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FilaMarca } from "@/lib/admin/marcas";
import { marcaSchema, type MarcaFormValues } from "@/lib/validations/marca";
import { actualizarMarca } from "../actions";

function DialogoEditar({
  marca,
  open,
  onOpenChange,
}: {
  marca: FilaMarca;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [guardando, guardar] = useTransition();
  const { register, handleSubmit, formState, setError } =
    useForm<MarcaFormValues>({
      resolver: standardSchemaResolver(marcaSchema),
      defaultValues: { name: marca.name },
      mode: "onSubmit",
    });

  function enviar(valores: MarcaFormValues) {
    guardar(async () => {
      const r = await actualizarMarca(marca.id, valores);
      if (!r.ok) {
        for (const [campo, mensajes] of Object.entries(r.errores ?? {})) {
          setError(campo as keyof MarcaFormValues, { message: mensajes[0] });
        }
        toast.error(r.mensaje);
        return;
      }
      toast.success("Marca actualizada.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(enviar)}>
          <DialogHeader>
            <DialogTitle>Editar marca</DialogTitle>
            <DialogDescription>
              La URL <code className="font-mono">/marca/{marca.slug}</code> no
              cambia: sólo se edita el nombre que se muestra.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5 py-2">
            <Label htmlFor="marca-name" className="text-xs uppercase">
              Nombre
            </Label>
            <Input
              id="marca-name"
              autoFocus
              aria-invalid={!!formState.errors.name}
              {...register("name")}
            />
            {formState.errors.name ? (
              <p className="text-xs font-medium text-destructive">
                {formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={guardando} className="gap-2">
              {guardando ? <Loader2 className="size-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TablaMarcas({ filas }: { filas: FilaMarca[] }) {
  const [editando, setEditando] = useState<FilaMarca | null>(null);

  return (
    <div className="overflow-hidden rounded border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60 hover:bg-muted/60">
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Marca
            </TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Slug
            </TableHead>
            <TableHead className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Productos
            </TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((fila) => (
            <TableRow key={fila.id}>
              <TableCell className="text-sm font-semibold text-foreground">
                {fila.name}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {fila.slug}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {fila.productos}
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Editar ${fila.name}`}
                  onClick={() => setEditando(fila)}
                >
                  <Pencil />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editando ? (
        <DialogoEditar
          marca={editando}
          open={editando !== null}
          onOpenChange={(open) => {
            if (!open) setEditando(null);
          }}
        />
      ) : null}
    </div>
  );
}
