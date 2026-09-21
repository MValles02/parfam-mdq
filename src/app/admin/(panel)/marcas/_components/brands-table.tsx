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
import type { BrandRow } from "@/lib/admin/brands";
import { brandSchema, type BrandFormValues } from "@/lib/validations/brand";
import { updateBrand } from "../actions";

function EditDialog({
  brand,
  open,
  onOpenChange,
}: {
  brand: BrandRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const { register, handleSubmit, formState, setError } =
    useForm<BrandFormValues>({
      resolver: standardSchemaResolver(brandSchema),
      defaultValues: { name: brand.name },
      mode: "onSubmit",
    });

  function submit(values: BrandFormValues) {
    startSaving(async () => {
      const result = await updateBrand(brand.id, values);
      if (!result.ok) {
        for (const [field, messages] of Object.entries(result.errores ?? {})) {
          setError(field as keyof BrandFormValues, { message: messages[0] });
        }
        toast.error(result.mensaje);
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
        <form onSubmit={handleSubmit(submit)}>
          <DialogHeader>
            <DialogTitle>Editar marca</DialogTitle>
            <DialogDescription>
              La URL <code className="font-mono">/marca/{brand.slug}</code> no
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
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BrandsTable({ rows }: { rows: BrandRow[] }) {
  const [editingBrand, setEditingBrand] = useState<BrandRow | null>(null);

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
          {rows.map((brand) => (
            <TableRow key={brand.id}>
              <TableCell className="text-sm font-semibold text-foreground">
                {brand.name}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {brand.slug}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {brand.productCount}
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Editar ${brand.name}`}
                  onClick={() => setEditingBrand(brand)}
                >
                  <Pencil />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editingBrand ? (
        <EditDialog
          brand={editingBrand}
          open={editingBrand !== null}
          onOpenChange={(open) => {
            if (!open) setEditingBrand(null);
          }}
        />
      ) : null}
    </div>
  );
}
