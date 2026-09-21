"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { ExternalLink, Loader2, Save, Send, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Concentration,
  Gender,
  Occasion,
  ProductStatus,
  Season,
} from "@/generated/prisma/enums";
import {
  CONCENTRATION_LABELS as concentrationLabels,
  SEASON_LABELS as seasonLabels,
  GENDER_LABELS as genderLabels,
  OCCASION_LABELS as occasionLabels,
} from "@/lib/catalog";
import type { EditableProduct } from "@/lib/admin/products";
import type { AdoptableReference } from "@/lib/admin/references";
import {
  productSchema,
  type ProductFormInput,
  type ProductFormValues,
} from "@/lib/validations/product";
import { cn } from "@/lib/utils";
import {
  searchBrandsAction,
  searchPerfumersAction,
  createPerfumerAction,
  saveProduct,
} from "../actions";
import { CharacteristicBar } from "./characteristic-bar";
import { Field, Step } from "./field";
import { RemoteCombobox } from "./remote-combobox";
import { PyramidEditor, type SelectedNote } from "./pyramid-editor";
import { VariantEditor } from "./variant-editor";
import { ImagePanel, type ProductImageItem } from "./image-panel";
import { ReferenceStep } from "./reference-step";
import { AccordSelector, type Accord } from "./accord-selector";

/** Note and perfumer names are display-only. The form stores IDs, while this
 * separate map avoids duplicating labels in submitted form state. */
type NamesById = Record<string, string>;

function getInitialValues(product: EditableProduct | null): ProductFormInput {
  if (!product) {
    return {
      name: "",
      brandId: null,
      brandName: "",
      fragranceRefId: null,
      sourceUrl: null,
      description: null,
      gender: null,
      concentration: null,
      year: null,
      seasons: [],
      occasions: [],
      longevity: null,
      sillage: null,
      intensity: null,
      status: ProductStatus.DRAFT,
      isFeatured: false,
      slug: null,
      seoTitle: null,
      seoDescription: null,
      notes: [],
      accordIds: [],
      perfumerIds: [],
      variants: [],
      images: [],
    };
  }
  return {
    name: product.name,
    brandId: product.brandId,
    brandName: product.brand.name,
    fragranceRefId: product.fragranceRefId,
    sourceUrl: product.sourceUrl,
    description: product.description,
    gender: product.gender,
    concentration: product.concentration,
    year: product.year,
    seasons: product.seasons,
    occasions: product.occasions,
    longevity: product.longevity,
    sillage: product.sillage,
    intensity: product.intensity,
    status: product.status,
    isFeatured: product.isFeatured,
    slug: product.slug,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    notes: product.notes.map((note) => ({
      noteId: note.note.id,
      position: note.position,
    })),
    accordIds: product.accords.map((accord) => accord.accord.id),
    perfumerIds: product.perfumers.map((entry) => entry.perfumer.id),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      kind: variant.kind,
      sizeMl: variant.sizeMl,
      priceArs: variant.priceArs,
      isActive: variant.isActive,
      sku: variant.sku,
    })),
    images: product.images.map((image) => ({
      id: image.id,
      storageKey: image.storageKey,
      alt: image.alt,
      isPrimary: image.isPrimary,
    })),
  };
}

function getInitialNames(product: EditableProduct | null): NamesById {
  if (!product) return {};
  const names: NamesById = {};
  for (const note of product.notes)
    names[note.note.id] = note.note.nameEs ?? note.note.nameEn;
  for (const entry of product.perfumers)
    names[entry.perfumer.id] = entry.perfumer.name;
  return names;
}

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
  const [adoptedReference, setAdoptedReference] = useState<{
    id: string;
    name: string;
    url: string | null;
  } | null>(
    product?.fragranceRefId && product.fragranceRef
      ? {
          id: product.fragranceRefId,
          name: product.fragranceRef.name,
          url: product.fragranceRef.url,
        }
      : null,
  );
  /** The reference's English copy helps writing but is never published. */
  const [referenceText, setReferenceText] = useState<string | null>(null);

  const form = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: standardSchemaResolver(productSchema),
    defaultValues: getInitialValues(product),
    mode: "onSubmit",
  });
  const { control, formState, handleSubmit, setValue, setError } = form;

  // `useWatch` avoids React Compiler's incompatible-library bailout caused by
  // `form.watch`, whose returned function cannot be memoized.
  const brandName = useWatch({ control, name: "brandName" });
  const brandId = useWatch({ control, name: "brandId" });
  const variants = useWatch({ control, name: "variants" }) ?? [];
  const activeVariants = variants.filter((variant) => variant.isActive).length;

  function adoptReference(reference: AdoptableReference) {
    // Prepopulate every field known to the dataset, while keeping the product
    // editable so future reimports cannot overwrite it.
    setAdoptedReference({
      id: reference.id,
      name: reference.name,
      url: reference.url,
    });
    setReferenceText(reference.descriptionEn);
    setIsManual(true);
    setValue("fragranceRefId", reference.id);
    setValue("sourceUrl", reference.url);
    setValue("name", reference.name, { shouldValidate: true });
    setValue("brandId", reference.brand.id);
    setValue("brandName", reference.brand.name, { shouldValidate: true });
    setValue("year", reference.year);
    setValue("gender", reference.gender);
    setValue(
      "notes",
      reference.notes.map((note) => ({
        noteId: note.noteId,
        position: note.position,
      })),
    );
    setValue(
      "accordIds",
      reference.accords.map((accord) => accord.accordId),
    );
    setValue(
      "perfumerIds",
      reference.perfumers.map((perfumer) => perfumer.perfumerId),
    );
    setNames((previousNames) => {
      const nextNames = { ...previousNames };
      for (const note of reference.notes) nextNames[note.noteId] = note.name;
      for (const perfumer of reference.perfumers)
        nextNames[perfumer.perfumerId] = perfumer.name;
      return nextNames;
    });
  }

  function unlinkReference() {
    setAdoptedReference(null);
    setReferenceText(null);
    setValue("fragranceRefId", null);
  }

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
        for (const [field, messages] of Object.entries(result.errores ?? {})) {
          setError(field as keyof ProductFormInput, {
            message: messages[0],
          });
        }
        toast.error(result.mensaje);
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
      else router.replace(`/admin/productos/${result.datos.id}`);
    })();
  }

  const errors = formState.errors;

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col gap-5 px-8 pt-6 pb-32"
    >
      <ReferenceStep
        adoptedReference={adoptedReference}
        onAdopt={adoptReference}
        onUnlink={unlinkReference}
        onManualEntry={() => setIsManual(true)}
        isManual={isManual}
      />

      {isManual ? (
        <>
          <Step
            number={2}
            title="Ficha de la fragancia"
            description={
              adoptedReference
                ? `Precargada desde «${adoptedReference.name}». Revisá y corregí lo que haga falta.`
                : "Cargala a mano: ningún campo viene precargado."
            }
          >
            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label="Nombre"
                htmlFor="name"
                isAutofilled={Boolean(adoptedReference)}
                error={errors.name?.message}
              >
                <Controller
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="name"
                      value={field.value ?? ""}
                      className="bg-background"
                      placeholder="Sauvage Elixir"
                    />
                  )}
                />
              </Field>

              <Field
                label="Marca"
                isAutofilled={Boolean(adoptedReference)}
                error={errors.brandName?.message}
                hint={
                  brandName && !brandId
                    ? `Se va a crear la marca «${brandName}».`
                    : undefined
                }
              >
                <RemoteCombobox
                  value={
                    brandName ? { id: brandId ?? "", label: brandName } : null
                  }
                  placeholder="Buscar o escribir la marca"
                  emptyText="Ninguna marca con ese nombre. Escribila entera para crearla."
                  search={async (query) => {
                    const result = await searchBrandsAction(query);
                    return result.ok
                      ? result.datos.map((brand) => ({
                          id: brand.id,
                          label: brand.nombre,
                        }))
                      : [];
                  }}
                  // Persistence finds or creates manual brands by slug when
                  // this form submits without a brand ID.
                  onCreate={async (name) => ({ id: "", label: name })}
                  onSelect={(option) => {
                    setValue("brandId", option.id === "" ? null : option.id);
                    setValue("brandName", option.label, {
                      shouldValidate: true,
                    });
                  }}
                />
              </Field>

              <Field
                label="Año"
                htmlFor="year"
                isAutofilled={Boolean(adoptedReference)}
                error={errors.year?.message}
              >
                <Controller
                  control={control}
                  name="year"
                  render={({ field }) => (
                    <Input
                      id="year"
                      inputMode="numeric"
                      placeholder="2021"
                      className="bg-background"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                        field.onChange(v === "" ? null : Number(v));
                      }}
                    />
                  )}
                />
              </Field>

              <Field
                label="Concentración"
                error={errors.concentration?.message}
                hint="El dataset no la trae: va a mano."
              >
                <Controller
                  control={control}
                  name="concentration"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? "__ninguna"}
                      onValueChange={(v) =>
                        field.onChange(v === "__ninguna" ? null : v)
                      }
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Elegir" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ninguna">
                          Sin especificar
                        </SelectItem>
                        {Object.values(Concentration).map((c) => (
                          <SelectItem key={c} value={c}>
                            {concentrationLabels[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field
                label="Género"
                isAutofilled={Boolean(adoptedReference)}
                error={errors.gender?.message}
              >
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? "__ninguno"}
                      onValueChange={(v) =>
                        field.onChange(v === "__ninguno" ? null : v)
                      }
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Elegir" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ninguno">
                          Sin especificar
                        </SelectItem>
                        {Object.values(Gender).map((g) => (
                          <SelectItem key={g} value={g}>
                            {genderLabels[g]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field
                label="Perfumista"
                isAutofilled={Boolean(adoptedReference)}
              >
                <Controller
                  control={control}
                  name="perfumerIds"
                  render={({ field }) => (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(field.value ?? []).map((id) => (
                        <span
                          key={id}
                          className="flex items-center gap-1.5 rounded-sm border bg-background py-1.5 pr-1.5 pl-2.5 text-xs font-medium"
                        >
                          {names[id] ?? "—"}
                          <button
                            type="button"
                            aria-label={`Quitar a ${names[id] ?? "este perfumista"}`}
                            onClick={() =>
                              field.onChange(
                                (field.value ?? []).filter((x) => x !== id),
                              )
                            }
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                      <RemoteCombobox
                        placeholder="Buscar perfumista…"
                        emptyText="Ninguno con ese nombre."
                        search={async (query) => {
                          const result = await searchPerfumersAction(query);
                          return result.ok
                            ? result.datos.map((perfumer) => ({
                                id: perfumer.id,
                                label: perfumer.nombre,
                              }))
                            : [];
                        }}
                        onCreate={async (name) => {
                          const result = await createPerfumerAction(name);
                          if (!result.ok) {
                            toast.error(result.mensaje);
                            return null;
                          }
                          return {
                            id: result.datos.id,
                            label: result.datos.nombre,
                          };
                        }}
                        onSelect={(option) => {
                          setNames((previousNames) => ({
                            ...previousNames,
                            [option.id]: option.label,
                          }));
                          const currentIds = field.value ?? [];
                          if (!currentIds.includes(option.id)) {
                            field.onChange([...currentIds, option.id]);
                          }
                        }}
                      >
                        <button
                          type="button"
                          className="rounded-sm border border-dashed px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-solid hover:text-foreground"
                        >
                          + Agregar
                        </button>
                      </RemoteCombobox>
                    </div>
                  )}
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field
                label="Descripción para el cliente"
                htmlFor="description"
                error={errors.description?.message}
                hint="Escribila vos: el texto del catálogo de referencia está en inglés y no se publica."
              >
                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      id="description"
                      rows={4}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="min-h-24 bg-background text-sm leading-relaxed"
                      placeholder="Cómo huele, cuánto dura, cuándo usarlo…"
                    />
                  )}
                />
              </Field>
              {referenceText ? (
                <details className="mt-2 rounded-md border bg-background px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                    Ver el texto en inglés de la referencia (interno, no se
                    publica)
                  </summary>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {referenceText}
                  </p>
                </details>
              ) : null}
            </div>

            <div className="mt-5">
              <Controller
                control={control}
                name="notes"
                render={({ field }) => (
                  <PyramidEditor
                    value={(field.value ?? []).map((n) => ({
                      noteId: n.noteId,
                      position: n.position,
                      name: names[n.noteId] ?? "—",
                    }))}
                    onChange={(notes: SelectedNote[]) => {
                      setNames((previousNames) => {
                        const nextNames = { ...previousNames };
                        for (const note of notes)
                          nextNames[note.noteId] = note.name;
                        return nextNames;
                      });
                      field.onChange(
                        notes.map((note) => ({
                          noteId: note.noteId,
                          position: note.position,
                        })),
                      );
                    }}
                  />
                )}
              />
            </div>

            <div className="mt-5">
              <Field label="Acordes" isAutofilled={Boolean(adoptedReference)}>
                <Controller
                  control={control}
                  name="accordIds"
                  render={({ field }) => (
                    <AccordSelector
                      accords={accords}
                      value={field.value ?? []}
                      onChange={field.onChange}
                    />
                  )}
                />
              </Field>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Estaciones">
                <Controller
                  control={control}
                  name="seasons"
                  render={({ field }) => (
                    <ToggleGroup
                      type="multiple"
                      variant="outline"
                      value={field.value ?? []}
                      onValueChange={field.onChange}
                      className="justify-start"
                    >
                      {Object.values(Season).map((s) => (
                        <ToggleGroupItem key={s} value={s} className="px-3">
                          {seasonLabels[s]}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  )}
                />
              </Field>

              <Field label="Ocasiones">
                <Controller
                  control={control}
                  name="occasions"
                  render={({ field }) => (
                    <ToggleGroup
                      type="multiple"
                      variant="outline"
                      value={field.value ?? []}
                      onValueChange={field.onChange}
                      className="justify-start"
                    >
                      {Object.values(Occasion).map((o) => (
                        <ToggleGroupItem key={o} value={o} className="px-3">
                          {occasionLabels[o]}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  )}
                />
              </Field>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {(
                [
                  ["longevity", "Duración"],
                  ["sillage", "Estela"],
                  ["intensity", "Intensidad"],
                ] as const
              ).map(([fieldName, label]) => (
                <Field key={fieldName} label={label}>
                  <Controller
                    control={control}
                    name={fieldName}
                    render={({ field }) => (
                      <CharacteristicBar
                        label={label}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Field>
              ))}
            </div>
          </Step>

          <Step
            number={3}
            title="Presentaciones y precios"
            description="No hay stock: si algo no está disponible, lo desactivás y deja de verse en la tienda."
          >
            <VariantEditor
              control={control}
              errorGeneral={
                errors.variants?.message ?? errors.variants?.root?.message
              }
            />
          </Step>

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
                />
              )}
            />
            {(errors.images?.message ?? errors.images?.root?.message) ? (
              <p className="mt-2 text-xs font-medium text-destructive">
                {errors.images?.message ?? errors.images?.root?.message}
              </p>
            ) : null}
          </Step>

          <Step
            number={5}
            title="SEO y enlace"
            description="Si los dejás vacíos, la tienda usa el nombre y la descripción del producto."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Dirección del producto"
                htmlFor="slug"
                error={errors.slug?.message}
                hint="Se arma sola con la marca y el nombre si la dejás vacía."
              >
                <Controller
                  control={control}
                  name="slug"
                  render={({ field }) => (
                    <div className="flex items-center rounded-md border bg-background pl-3 text-sm">
                      <span className="shrink-0 text-muted-foreground">
                        /producto/
                      </span>
                      <Input
                        {...field}
                        id="slug"
                        value={field.value ?? ""}
                        placeholder="dior-sauvage-elixir"
                        className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                      />
                    </div>
                  )}
                />
              </Field>

              <Field
                label="Link de Fragrantica"
                htmlFor="sourceUrl"
                error={errors.sourceUrl?.message}
                hint="Referencia interna, por si hay que volver a mirar la ficha original."
              >
                <Controller
                  control={control}
                  name="sourceUrl"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="sourceUrl"
                      value={field.value ?? ""}
                      placeholder="https://www.fragrantica.com/perfume/…"
                      className="bg-background"
                    />
                  )}
                />
              </Field>

              <Field
                label="Título SEO"
                htmlFor="seoTitle"
                error={errors.seoTitle?.message}
              >
                <Controller
                  control={control}
                  name="seoTitle"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="seoTitle"
                      value={field.value ?? ""}
                      className="bg-background"
                    />
                  )}
                />
              </Field>

              <Field
                label="Descripción SEO"
                htmlFor="seoDescription"
                error={errors.seoDescription?.message}
              >
                <Controller
                  control={control}
                  name="seoDescription"
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      id="seoDescription"
                      rows={2}
                      value={field.value ?? ""}
                      className="bg-background"
                    />
                  )}
                />
              </Field>
            </div>
          </Step>

          {/* Keep controls visible because the form extends beyond one screen. */}
          <div className="sticky bottom-0 -mx-8 flex items-center justify-between gap-4 border-t bg-card/95 px-8 py-4 backdrop-blur">
            <div className="flex flex-col gap-0.5 text-[13px] text-muted-foreground">
              <span>
                {variants.length === 0
                  ? "Todavía no cargaste presentaciones."
                  : `${activeVariants} de ${variants.length} ${variants.length === 1 ? "presentación se va" : "presentaciones se van"} a ver en la tienda`}
              </span>
              {adoptedReference?.url ? (
                <a
                  href={adoptedReference.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1 text-xs hover:text-foreground"
                >
                  Ver la referencia en Fragrantica
                  <ExternalLink className="size-3" />
                </a>
              ) : null}
            </div>

            <Controller
              control={control}
              name="isFeatured"
              render={({ field }) => (
                <label className="flex cursor-pointer items-center gap-2.5">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <span
                    className={cn(
                      "flex items-center gap-1.5 text-sm font-medium",
                      !field.value && "text-muted-foreground",
                    )}
                  >
                    <Star
                      className={cn("size-3.5", field.value && "fill-current")}
                    />
                    Destacado
                  </span>
                </label>
              )}
            />

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => submit(ProductStatus.DRAFT)}
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Guardar borrador
              </Button>
              <Button
                type="button"
                disabled={isSaving}
                onClick={() => submit(ProductStatus.PUBLISHED)}
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {product?.status === ProductStatus.PUBLISHED
                  ? "Guardar publicado"
                  : "Publicar producto"}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <p className={cn("text-sm text-muted-foreground")}>
          Buscá la fragancia arriba para arrancar, o cargala a mano.
        </p>
      )}
    </form>
  );
}
