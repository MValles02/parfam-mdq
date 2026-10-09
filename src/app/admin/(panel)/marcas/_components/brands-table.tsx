"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ColumnHeader } from "@/components/admin/listing-table";
import { setServerFieldErrors } from "@/components/admin/server-field-errors";
import type { BrandRow } from "@/lib/admin/brands";
import {
  brandSchema,
  type BrandFormInput,
  type BrandFormValues,
} from "@/lib/validations/brand";
import { updateBrand } from "../actions";

/** One inline form per row; Guardar appears only while the row is dirty. */
function BrandRowForm({ brand }: { brand: BrandRow }) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const { register, handleSubmit, formState, setError, reset } = useForm<
    BrandFormInput,
    unknown,
    BrandFormValues
  >({
    resolver: standardSchemaResolver(brandSchema),
    defaultValues: { name: brand.name, country: brand.country ?? "" },
    mode: "onSubmit",
  });

  function submit(values: BrandFormValues) {
    startSaving(async () => {
      const result = await updateBrand(brand.id, values);
      if (!result.ok) {
        setServerFieldErrors(setError, result.fieldErrors);
        toast.error(result.message);
        return;
      }
      toast.success("Marca actualizada.");
      reset({ name: values.name, country: values.country ?? "" });
      router.refresh();
    });
  }

  const formId = `brand-${brand.id}`;

  return (
    <TableRow>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {brand.slug}
      </TableCell>
      <TableCell>
        <form id={formId} onSubmit={handleSubmit(submit)}>
          <Input
            aria-label={`Nombre de ${brand.slug}`}
            aria-invalid={!!formState.errors.name}
            className="min-w-40"
            {...register("name")}
          />
        </form>
        {formState.errors.name ? (
          <p className="mt-1 text-xs font-medium text-destructive">
            {formState.errors.name.message}
          </p>
        ) : null}
      </TableCell>
      <TableCell>
        <Input
          form={formId}
          aria-label={`País de ${brand.slug}`}
          aria-invalid={!!formState.errors.country}
          className="min-w-32"
          {...register("country")}
        />
        {formState.errors.country ? (
          <p className="mt-1 text-xs font-medium text-destructive">
            {formState.errors.country.message}
          </p>
        ) : null}
      </TableCell>
      <TableCell className="text-sm">
        <Link
          href={`/admin/productos?q=${encodeURIComponent(brand.name)}`}
          className="font-medium text-foreground underline"
        >
          {brand.productCount}
        </Link>
      </TableCell>
      <TableCell className="w-28 text-right">
        {formState.isDirty ? (
          <Button type="submit" form={formId} size="sm" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : null}
            Guardar
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

export function BrandsTable({ rows }: { rows: BrandRow[] }) {
  return (
    <div className="overflow-x-auto rounded border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60 hover:bg-muted/60">
            <ColumnHeader>Slug</ColumnHeader>
            <ColumnHeader>Nombre</ColumnHeader>
            <ColumnHeader>País</ColumnHeader>
            <ColumnHeader>Productos</ColumnHeader>
            <TableHead className="w-28"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((brand) => (
            <BrandRowForm key={brand.id} brand={brand} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
