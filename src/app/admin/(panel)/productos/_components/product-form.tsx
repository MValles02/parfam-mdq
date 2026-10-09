"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { toast } from "sonner";
import { setServerFieldErrors } from "@/components/admin/server-field-errors";
import { ProductStatus } from "@/generated/prisma/enums";
import type { EditableProduct } from "@/lib/admin/products";
import {
  productSchema,
  type ProductFormInput,
  type ProductFormValues,
} from "@/lib/validations/product";
import { saveProduct } from "../actions";
import { getAdminProductPath } from "../paths";
import type { Accord } from "./accord-selector";
import { FormActionBar } from "./form-action-bar";
import { FragranceStep } from "./fragrance-step";
import { ImagePanel } from "./image-panel";
import type { ProductImageItem } from "./image-list";
import {
  getInitialNames,
  getInitialValues,
  withNames,
  type NameEntry,
  type NamesById,
} from "./product-form-values";
import { PublishSidebar } from "./publish-sidebar";
import { ReferenceStep } from "./reference-step";
import { SeoStep } from "./seo-step";
import { Step } from "./step";
import { useReferenceAdoption } from "./use-reference-adoption";
import { VariantEditor } from "./variant-editor";

export function ProductForm({
  product,
  accords,
  isR2Configured,
  publicBaseUrl,
}: {
  product: EditableProduct | null;
  accords: Accord[];
  isR2Configured: boolean;
  /** Public R2 host, used only for image previews in the admin panel. */
  publicBaseUrl: string | null;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [names, setNames] = useState<NamesById>(() => getInitialNames(product));
  const [isManual, setIsManual] = useState(product !== null);

  const form = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: standardSchemaResolver(productSchema),
    defaultValues: getInitialValues(product),
    mode: "onSubmit",
  });
  const { control, formState, handleSubmit, setValue, setError } = form;

  function addNames(entries: NameEntry[]) {
    setNames((previousNames) => withNames(previousNames, entries));
  }

  const {
    adoptedReference,
    referenceText,
    isImportingReferencePicture,
    appendImage,
    adoptReference,
    unlinkReference,
  } = useReferenceAdoption({
    product,
    form,
    onAdopt: (reference) => {
      setIsManual(true);
      addNames([
        ...reference.notes.map((note) => [note.noteId, note.name] as const),
        ...reference.perfumers.map(
          (perfumer) => [perfumer.perfumerId, perfumer.name] as const,
        ),
      ]);
    },
  });

  function submit(status: ProductStatus) {
    setValue("status", status);
    void handleSubmit(async (values) => {
      const result = await new Promise<Awaited<ReturnType<typeof saveProduct>>>(
        (resolve) => {
          startSaving(async () =>
            resolve(await saveProduct(product?.id ?? null, values)),
          );
        },
      );

      if (!result.ok) {
        // Server field errors belong beside the corresponding control rather
        // than in a generic message at the top.
        setServerFieldErrors(setError, result.fieldErrors);
        toast.error(result.message);
        return;
      }

      toast.success(
        status === ProductStatus.PUBLISHED
          ? "Producto publicado."
          : "Borrador guardado.",
      );
      // Navigation remounts the form with persisted IDs for newly created
      // variants and images, preventing duplicate rows on the next save.
      if (product) router.refresh();
      else router.replace(getAdminProductPath(result.data.id));
    })();
  }

  const errors = formState.errors;
  // React Hook Form can report an array-level rule on the array itself or
  // under its `root` key, so both are checked.
  const imagesError = errors.images?.message ?? errors.images?.root?.message;

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col pb-16">
      <FormActionBar
        product={product}
        isManual={isManual}
        isDirty={formState.isDirty}
        isSaving={isSaving}
        isImportingReferencePicture={isImportingReferencePicture}
        saveAction={submit}
      />

      <div className="grid gap-5 px-4 pt-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          <ReferenceStep
            adoptedReference={adoptedReference}
            onAdopt={adoptReference}
            onUnlink={unlinkReference}
            onManualEntry={() => setIsManual(true)}
            isManual={isManual}
          />

          {isManual ? (
            <>
              <div id="basicos" className="scroll-mt-24">
                <FragranceStep
                  control={control}
                  setValue={setValue}
                  errors={errors}
                  adoptedReference={adoptedReference}
                  referenceText={referenceText}
                  accords={accords}
                  names={names}
                  onNamesChange={addNames}
                  communityVotes={product?.communityVotes}
                />
              </div>

              <div id="precios" className="scroll-mt-24">
                <Step
                  number={3}
                  title="Presentaciones y precios"
                  description="No hay stock: si algo no está disponible, lo desactivás y deja de verse en la tienda."
                >
                  <VariantEditor
                    control={control}
                    error={
                      errors.variants?.message ?? errors.variants?.root?.message
                    }
                  />
                </Step>
              </div>

              <div id="fotos" className="scroll-mt-24">
                <Step
                  number={4}
                  title="Fotos"
                  description="Fotos propias. Las imágenes de Fragrantica son referencia interna y no se publican."
                >
                  <Controller
                    control={control}
                    name="images"
                    render={({ field }) => (
                      <ImagePanel
                        isR2Configured={isR2Configured}
                        publicBaseUrl={publicBaseUrl}
                        value={(field.value ?? []) as ProductImageItem[]}
                        onChange={field.onChange}
                        onUploadComplete={appendImage}
                        isImportingReferencePicture={
                          isImportingReferencePicture
                        }
                      />
                    )}
                  />
                  {imagesError ? (
                    <p className="mt-2 text-xs font-medium text-destructive">
                      {imagesError}
                    </p>
                  ) : null}
                </Step>
              </div>

              <div id="mas-datos" className="scroll-mt-24">
                <SeoStep control={control} errors={errors} />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Buscá la fragancia arriba para arrancar, o cargala a mano.
            </p>
          )}
        </div>

        {isManual ? (
          <PublishSidebar
            control={control}
            isImportingReferencePicture={isImportingReferencePicture}
            referenceUrl={adoptedReference?.referenceUrl}
          />
        ) : null}
      </div>
    </form>
  );
}
