"use client";

import { useWatch, type Control, type UseFormSetValue } from "react-hook-form";
import { Field } from "@/components/admin/field";
import type { ProductFormInput } from "@/lib/validations/product";
import { searchBrandsAction } from "../actions";
import { RemoteCombobox } from "./remote-combobox";

/**
 * Brand picker that also accepts a typed name with no brand ID. Persistence
 * finds or creates such a brand by slug when the form submits.
 */
export function BrandField({
  control,
  setValue,
  isAutofilled,
  error,
}: {
  control: Control<ProductFormInput>;
  setValue: UseFormSetValue<ProductFormInput>;
  isAutofilled: boolean;
  error?: string;
}) {
  // `useWatch` avoids React Compiler's incompatible-library bailout caused by
  // `form.watch`, whose returned function cannot be memoized.
  const brandName = useWatch({ control, name: "brandName" });
  const brandId = useWatch({ control, name: "brandId" });

  return (
    <Field
      label="Marca"
      isAutofilled={isAutofilled}
      error={error}
      hint={
        brandName && !brandId
          ? `Se va a crear la marca «${brandName}».`
          : undefined
      }
    >
      <RemoteCombobox
        value={brandName ? { id: brandId ?? "", label: brandName } : null}
        placeholder="Buscar o escribir la marca"
        emptyText="Ninguna marca con ese nombre. Escribila entera para crearla."
        search={async (query) => {
          const result = await searchBrandsAction(query);
          return result.ok
            ? result.data.map((brand) => ({
                id: brand.id,
                label: brand.name,
              }))
            : [];
        }}
        // An empty ID marks a typed name with no matching brand yet.
        onCreate={async (name) => ({ id: "", label: name })}
        onSelect={(option) => {
          setValue("brandId", option.id === "" ? null : option.id);
          setValue("brandName", option.label, {
            shouldValidate: true,
          });
        }}
      />
    </Field>
  );
}
