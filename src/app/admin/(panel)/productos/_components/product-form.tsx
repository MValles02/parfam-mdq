"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import Link from "next/link";
import { ExternalLink, Eye, Loader2, Save, Send, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/admin/field";
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
import { Concentration, Gender, ProductStatus } from "@/generated/prisma/enums";
import {
  CONCENTRATION_LABELS as concentrationLabels,
  DAYPART_KEYS as daypartKeys,
  DAYPART_LABELS as daypartLabels,
  GENDER_LABELS as genderLabels,
  LONGEVITY_LABELS as longevityLabels,
  SEASON_KEYS as seasonKeys,
  SEASON_LABELS as seasonLabels,
  SILLAGE_LABELS as sillageLabels,
  type DaypartKey,
  type SeasonKey,
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
import { deleteUploadedImage, importReferencePicture } from "../image-actions";
import { CharacteristicBar } from "./characteristic-bar";
import { Step } from "./field";
import { RemoteCombobox } from "./remote-combobox";
import { PyramidEditor, type SelectedNote } from "./pyramid-editor";
import { VariantEditor } from "./variant-editor";
import { ImagePanel, type ProductImageItem } from "./image-panel";
import { ReferenceStep } from "./reference-step";
import {
  AccordSelector,
  type Accord,
  type SelectedAccord,
} from "./accord-selector";

const SECTION_LINKS = [
  ["#basicos", "Datos básicos"],
  ["#fotos", "Fotos"],
  ["#precios", "Precios"],
  ["#descripcion", "Descripción"],
  ["#perfil", "Perfil"],
  ["#mas-datos", "Más datos"],
] as const;

/** Maps each `SeasonKey` (used for shared labels) to its form field. */
const SEASON_FIELD_NAMES: Record<
  SeasonKey,
  "seasonSpring" | "seasonSummer" | "seasonFall" | "seasonWinter"
> = {
  spring: "seasonSpring",
  summer: "seasonSummer",
  fall: "seasonFall",
  winter: "seasonWinter",
};

/** Maps each `DaypartKey` (used for shared labels) to its form field. */
const DAYPART_FIELD_NAMES: Record<DaypartKey, "daypartDay" | "daypartNight"> = {
  day: "daypartDay",
  night: "daypartNight",
};

/** Static reminder of the Spanish scale so the administrator does not need to
 * memorize what a given longevity or sillage number means. */
const LONGEVITY_HINT = Object.entries(longevityLabels)
  .map(([step, label]) => `${step} ${label}`)
  .join(" · ");
const SILLAGE_HINT = Object.entries(sillageLabels)
  .map(([step, label]) => `${step} ${label}`)
  .join(" · ");

/** Digits-only 0..100 percentage input, used for the season and daypart split. */
function PercentageInput({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex items-center rounded-md border bg-background pr-2.5">
      <Input
        id={id}
        inputMode="numeric"
        value={value ?? ""}
        placeholder="0"
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
          onChange(digits === "" ? null : Math.min(100, Number(digits)));
        }}
        className="border-0 bg-transparent shadow-none focus-visible:ring-0"
      />
      <span className="shrink-0 text-xs text-muted-foreground">%</span>
    </div>
  );
}

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
      collection: null,
      longevity: null,
      sillage: null,
      intensity: null,
      seasonSpring: null,
      seasonSummer: null,
      seasonFall: null,
      seasonWinter: null,
      daypartDay: null,
      daypartNight: null,
      status: ProductStatus.DRAFT,
      isFeatured: false,
      slug: null,
      seoTitle: null,
      seoDescription: null,
      notes: [],
      accords: [],
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
    collection: product.collection,
    longevity: product.longevity,
    sillage: product.sillage,
    intensity: product.intensity,
    seasonSpring: product.seasonSpring,
    seasonSummer: product.seasonSummer,
    seasonFall: product.seasonFall,
    seasonWinter: product.seasonWinter,
    daypartDay: product.daypartDay,
    daypartNight: product.daypartNight,
    status: product.status,
    isFeatured: product.isFeatured,
    slug: product.slug,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    notes: product.notes.map((note) => ({
      noteId: note.note.id,
      position: note.position,
      weight: note.weight,
    })),
    accords: product.accords.map((accord) => ({
      accordId: accord.accord.id,
      strength: accord.strength,
    })),
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
    referenceUrl: string | null;
  } | null>(
    product?.fragranceRefId && product.fragranceRef
      ? {
          id: product.fragranceRefId,
          name: product.fragranceRef.name,
          referenceUrl: product.fragranceRef.referenceUrl,
        }
      : null,
  );
  /** The reference's English copy helps writing but is never published. */
  const [referenceText, setReferenceText] = useState<string | null>(null);
  const [isImportingReferencePicture, setIsImportingReferencePicture] =
    useState(false);
  // Identifies the current picture import call. Incremented on every new
  // adoption and on every unlink, so a response belongs to the admin's latest
  // action only if it still holds the token it was issued; any earlier
  // adoption's response (or one abandoned by an unlink) is discarded instead
  // of appended to the wrong product.
  const pictureImportToken = useRef(0);
  // Storage key of the picture copied in for whichever reference is
  // currently adopted, if that import has already resolved. Lets unlinking
  // or adopting a different reference remove that one picture instead of
  // leaving it (or, on a second adoption, both pictures) in the images list.
  const currentReferencePictureKey = useRef<string | null>(null);
  // Keys the product already had in R2 when this form loaded. A picture
  // tracked above that is one of these was saved in an earlier session, so it
  // must be left for the admin to remove by hand rather than deleted here.
  const [savedStorageKeys] = useState(
    () => new Set(product?.images.map((image) => image.storageKey) ?? []),
  );

  const form = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: standardSchemaResolver(productSchema),
    defaultValues: getInitialValues(product),
    mode: "onSubmit",
  });
  const { control, formState, handleSubmit, setValue, setError, getValues } =
    form;

  // `useWatch` avoids React Compiler's incompatible-library bailout caused by
  // `form.watch`, whose returned function cannot be memoized.
  const brandName = useWatch({ control, name: "brandName" });
  const brandId = useWatch({ control, name: "brandId" });
  const variants = useWatch({ control, name: "variants" }) ?? [];
  const activeVariants = variants.filter((variant) => variant.isActive).length;
  const description = useWatch({ control, name: "description" }) ?? "";
  const productName = useWatch({ control, name: "name" }) ?? "";
  const isPublished = product?.status === ProductStatus.PUBLISHED;
  // Mirrors the publish rule enforced by `productSchema` and
  // `changeProductStatus`: an active variant and a description.
  const checklist = [
    {
      label: "Nombre y marca",
      done: productName.trim() !== "" && Boolean(brandName?.trim()),
      href: "#basicos",
    },
    {
      label: "Una presentación activa",
      done: activeVariants > 0,
      href: "#precios",
    },
    {
      label: "Descripción",
      done: description.trim() !== "",
      href: "#descripcion",
    },
  ];

  // Single source of truth for adding an image: it reads the form's current
  // `images` value and writes the appended result in the same synchronous
  // step, so the manual-upload flow (`ImagePanel`'s `onUploadComplete`) and
  // the reference-picture import below cannot read each other's stale value
  // and either drop an image or mark two of them primary.
  function appendImage(storageKey: string) {
    const currentImages = getValues("images") ?? [];
    setValue("images", [
      ...currentImages,
      {
        id: null,
        storageKey,
        alt: null,
        isPrimary: currentImages.length === 0,
      },
    ]);
  }

  // Drops the picture tracked in `currentReferencePictureKey`, if it was
  // never saved: removes it from the form's images (reassigning primary when
  // it was the primary image) and deletes the R2 object. A picture that was
  // already part of the product when the form loaded is left alone instead,
  // since the admin may still want it.
  function releaseCurrentReferencePicture() {
    const key = currentReferencePictureKey.current;
    currentReferencePictureKey.current = null;
    if (!key || savedStorageKeys.has(key)) return;

    const currentImages = getValues("images") ?? [];
    const index = currentImages.findIndex((image) => image.storageKey === key);
    if (index === -1) return;

    const remainingImages = currentImages.filter((_, i) => i !== index);
    if (currentImages[index]!.isPrimary && remainingImages.length > 0) {
      remainingImages[0] = { ...remainingImages[0]!, isPrimary: true };
    }
    setValue("images", remainingImages);
    void deleteUploadedImage(key).catch(() => {});
  }

  function adoptReference(reference: AdoptableReference) {
    // Release whatever picture the previously adopted reference (if any)
    // copied in, so adopting a second reference does not append its picture
    // next to the first one.
    releaseCurrentReferencePicture();

    // Prepopulate every field known to the dataset, while keeping the product
    // editable so future reimports cannot overwrite it.
    setAdoptedReference({
      id: reference.id,
      name: reference.name,
      referenceUrl: reference.referenceUrl,
    });
    setReferenceText(reference.descriptionEn);
    setIsManual(true);
    setValue("fragranceRefId", reference.id);
    setValue("sourceUrl", reference.referenceUrl);
    setValue("name", reference.name, { shouldValidate: true });
    setValue("brandId", reference.brand.id);
    setValue("brandName", reference.brand.name, { shouldValidate: true });
    setValue("year", reference.year);
    setValue("gender", reference.gender);
    setValue("collection", reference.collection);
    setValue("longevity", reference.longevity);
    setValue("sillage", reference.sillage);
    setValue("seasonSpring", reference.seasonSpring);
    setValue("seasonSummer", reference.seasonSummer);
    setValue("seasonFall", reference.seasonFall);
    setValue("seasonWinter", reference.seasonWinter);
    setValue("daypartDay", reference.daypartDay);
    setValue("daypartNight", reference.daypartNight);
    setValue(
      "notes",
      reference.notes.map((note) => ({
        noteId: note.noteId,
        position: note.position,
        weight: note.weight,
      })),
    );
    setValue(
      "accords",
      reference.accords.map((accord) => ({
        accordId: accord.accordId,
        strength: accord.strength,
      })),
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

    // Copy the reference's picture into R2 exactly once per adoption. The
    // form keeps working meanwhile; a failure keeps the adoption and just
    // leaves the photo for the admin to upload by hand.
    const importToken = ++pictureImportToken.current;
    setIsImportingReferencePicture(true);
    void importReferencePicture(reference.id)
      .then((result) => {
        if (pictureImportToken.current !== importToken) {
          // A later unlink or adoption already moved past this import; its
          // upload would otherwise stay orphaned in R2.
          if (result.ok)
            void deleteUploadedImage(result.data.storageKey).catch(() => {});
          return;
        }
        setIsImportingReferencePicture(false);
        if (!result.ok) {
          toast.error(
            "No pudimos traer la foto de referencia; podés subirla a mano.",
          );
          return;
        }
        appendImage(result.data.storageKey);
        currentReferencePictureKey.current = result.data.storageKey;
      })
      .catch(() => {
        if (pictureImportToken.current !== importToken) return;
        setIsImportingReferencePicture(false);
        toast.error(
          "No pudimos traer la foto de referencia; podés subirla a mano.",
        );
      });
  }

  function unlinkReference() {
    // Invalidate any picture import still in flight: its result would belong
    // to the reference the admin just unlinked, not to the current adoption.
    pictureImportToken.current += 1;
    setIsImportingReferencePicture(false);
    releaseCurrentReferencePicture();
    setAdoptedReference(null);
    setReferenceText(null);
    setValue("fragranceRefId", null);

    // These values only exist because a reference was adopted (see
    // `docs/modules/admin-references.md`'s community-derived fields). Once
    // unlinked, `communityVotes` will be saved as null, and the store shows
    // community data whenever it is null — so leaving these behind would
    // publish community numbers for a product with no linked reference,
    // including one below the vote threshold that hides them.
    setValue("longevity", null);
    setValue("sillage", null);
    setValue("seasonSpring", null);
    setValue("seasonSummer", null);
    setValue("seasonFall", null);
    setValue("seasonWinter", null);
    setValue("daypartDay", null);
    setValue("daypartNight", null);

    toast.info(
      "Desvinculamos la referencia y limpiamos los datos de la comunidad.",
    );
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
        for (const [field, messages] of Object.entries(
          result.fieldErrors ?? {},
        )) {
          setError(field as keyof ProductFormInput, {
            message: messages[0],
          });
        }
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
      else router.replace(`/admin/productos/${result.data.id}`);
    })();
  }

  const errors = formState.errors;

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col pb-16">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur sm:px-8">
        {product ? (
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-xs text-muted-foreground">
              <Link href="/admin/productos" className="hover:text-foreground">
                Productos
              </Link>
              {` / ${product.brand.name}`}
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-xl font-extrabold tracking-tight">
                {product.name}
              </h1>
              <span
                className={cn(
                  "rounded border px-2 py-0.5 text-xs font-semibold",
                  isPublished
                    ? "border-success-border bg-success text-success-foreground"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                {isPublished ? "Publicado" : "Borrador"}
              </span>
              {formState.isDirty ? (
                <span className="text-xs text-muted-foreground">
                  Cambios sin guardar
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            {formState.isDirty ? "Cambios sin guardar" : ""}
          </span>
        )}

        {isManual ? (
          <div className="flex flex-wrap items-center gap-2.5">
            {product && isPublished ? (
              <Button type="button" variant="ghost" asChild>
                <Link
                  href={`/producto/${product.slug}`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <Eye className="size-4" />
                  Vista previa
                </Link>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={isSaving || isImportingReferencePicture}
              onClick={() =>
                submit(
                  isPublished ? ProductStatus.PUBLISHED : ProductStatus.DRAFT,
                )
              }
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Guardar
            </Button>
            {isPublished ? (
              <Button
                type="button"
                variant="ghost"
                disabled={isSaving || isImportingReferencePicture}
                onClick={() => submit(ProductStatus.DRAFT)}
              >
                Pasar a borrador
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isSaving || isImportingReferencePicture}
                onClick={() => submit(ProductStatus.PUBLISHED)}
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Publicar
              </Button>
            )}
          </div>
        ) : null}
      </div>

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
                          brandName
                            ? { id: brandId ?? "", label: brandName }
                            : null
                        }
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
                        // Persistence finds or creates manual brands by slug when
                        // this form submits without a brand ID.
                        onCreate={async (name) => ({ id: "", label: name })}
                        onSelect={(option) => {
                          setValue(
                            "brandId",
                            option.id === "" ? null : option.id,
                          );
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
                              const v = e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 4);
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
                                      (field.value ?? []).filter(
                                        (x) => x !== id,
                                      ),
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
                                const result =
                                  await searchPerfumersAction(query);
                                return result.ok
                                  ? result.data.map((perfumer) => ({
                                      id: perfumer.id,
                                      label: perfumer.name,
                                    }))
                                  : [];
                              }}
                              onCreate={async (name) => {
                                const result = await createPerfumerAction(name);
                                if (!result.ok) {
                                  toast.error(result.message);
                                  return null;
                                }
                                return {
                                  id: result.data.id,
                                  label: result.data.name,
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

                  <div id="descripcion" className="mt-4 scroll-mt-24">
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
                          Ver el texto en inglés de la referencia (interno, no
                          se publica)
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
                            weight: n.weight ?? 0,
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
                                weight: note.weight,
                              })),
                            );
                          }}
                        />
                      )}
                    />
                  </div>

                  <div className="mt-5">
                    <Field
                      label="Acordes"
                      isAutofilled={Boolean(adoptedReference)}
                    >
                      <Controller
                        control={control}
                        name="accords"
                        render={({ field }) => (
                          <AccordSelector
                            accords={accords}
                            value={(field.value ?? []) as SelectedAccord[]}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </Field>
                  </div>

                  <div
                    id="perfil"
                    className="mt-5 flex scroll-mt-24 flex-col gap-4"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                        Perfil
                      </span>
                      {product?.communityVotes ? (
                        <span className="text-xs text-muted-foreground">
                          Votos de la comunidad: {product.communityVotes}
                        </span>
                      ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      {seasonKeys.map((key) => {
                        const fieldName = SEASON_FIELD_NAMES[key];
                        return (
                          <Field
                            key={key}
                            label={seasonLabels[key]}
                            htmlFor={fieldName}
                          >
                            <Controller
                              control={control}
                              name={fieldName}
                              render={({ field }) => (
                                <PercentageInput
                                  id={fieldName}
                                  value={field.value}
                                  onChange={field.onChange}
                                />
                              )}
                            />
                          </Field>
                        );
                      })}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {daypartKeys.map((key) => {
                        const fieldName = DAYPART_FIELD_NAMES[key];
                        return (
                          <Field
                            key={key}
                            label={daypartLabels[key]}
                            htmlFor={fieldName}
                          >
                            <Controller
                              control={control}
                              name={fieldName}
                              render={({ field }) => (
                                <PercentageInput
                                  id={fieldName}
                                  value={field.value}
                                  onChange={field.onChange}
                                />
                              )}
                            />
                          </Field>
                        );
                      })}
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <Field
                        label="Colección"
                        htmlFor="collection"
                        isAutofilled={Boolean(adoptedReference)}
                        error={errors.collection?.message}
                      >
                        <Controller
                          control={control}
                          name="collection"
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="collection"
                              value={field.value ?? ""}
                              className="bg-background"
                              placeholder="Sauvage"
                            />
                          )}
                        />
                      </Field>

                      <Field
                        label="Duración (longevidad)"
                        htmlFor="longevity"
                        isAutofilled={Boolean(adoptedReference)}
                        error={errors.longevity?.message}
                        hint={LONGEVITY_HINT}
                      >
                        <Controller
                          control={control}
                          name="longevity"
                          render={({ field }) => (
                            <Input
                              id="longevity"
                              type="number"
                              step={0.01}
                              min={1}
                              max={5}
                              className="bg-background"
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                field.onChange(v === "" ? null : Number(v));
                              }}
                            />
                          )}
                        />
                      </Field>

                      <Field
                        label="Estela (sillage)"
                        htmlFor="sillage"
                        isAutofilled={Boolean(adoptedReference)}
                        error={errors.sillage?.message}
                        hint={SILLAGE_HINT}
                      >
                        <Controller
                          control={control}
                          name="sillage"
                          render={({ field }) => (
                            <Input
                              id="sillage"
                              type="number"
                              step={0.01}
                              min={1}
                              max={4}
                              className="bg-background"
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                field.onChange(v === "" ? null : Number(v));
                              }}
                            />
                          )}
                        />
                      </Field>
                    </div>

                    <Field label="Intensidad">
                      <Controller
                        control={control}
                        name="intensity"
                        render={({ field }) => (
                          <CharacteristicBar
                            label="Intensidad"
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </Field>
                  </div>
                </Step>
              </div>

              <div id="precios" className="scroll-mt-24">
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
                  {(errors.images?.message ?? errors.images?.root?.message) ? (
                    <p className="mt-2 text-xs font-medium text-destructive">
                      {errors.images?.message ?? errors.images?.root?.message}
                    </p>
                  ) : null}
                </Step>
              </div>

              <div id="mas-datos" className="scroll-mt-24">
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
              </div>
            </>
          ) : (
            <p className={cn("text-sm text-muted-foreground")}>
              Buscá la fragancia arriba para arrancar, o cargala a mano.
            </p>
          )}
        </div>

        {isManual ? (
          <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-col gap-3 rounded-md border bg-card p-5">
              <h2 className="text-sm font-bold tracking-[-0.01em]">
                Para publicar
              </h2>
              <div
                role="img"
                aria-label={`Requisitos: ${checklist.filter((item) => item.done).length} de ${checklist.length}`}
                className="flex gap-0.5"
              >
                {checklist.map((item) => (
                  <span
                    key={item.label}
                    className={cn(
                      "h-1.5 flex-1 rounded-full",
                      item.done ? "bg-success-foreground" : "bg-border",
                    )}
                  />
                ))}
              </div>
              <ul className="flex flex-col gap-1.5 text-sm">
                {checklist.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2",
                        item.done
                          ? "text-foreground"
                          : "text-warning-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          item.done
                            ? "bg-success-foreground"
                            : "bg-warning-foreground",
                        )}
                      />
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                {description.length} caracteres de descripción
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-md border bg-card p-5 text-[13px] text-muted-foreground">
              <span>
                {variants.length === 0
                  ? "Todavía no cargaste presentaciones."
                  : `${activeVariants} de ${variants.length} ${variants.length === 1 ? "presentación se va" : "presentaciones se van"} a ver en la tienda`}
              </span>
              {isImportingReferencePicture ? (
                <span className="flex items-center gap-1.5 text-xs">
                  <Loader2 className="size-3 animate-spin" />
                  Trayendo la foto de referencia…
                </span>
              ) : null}
              {adoptedReference?.referenceUrl ? (
                <a
                  href={adoptedReference.referenceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1 text-xs hover:text-foreground"
                >
                  Ver la referencia en Fragrantica
                  <ExternalLink className="size-3" />
                </a>
              ) : null}
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
                        className={cn(
                          "size-3.5",
                          field.value && "fill-current",
                        )}
                      />
                      Destacado
                    </span>
                  </label>
                )}
              />
            </div>

            <nav
              aria-label="Secciones"
              className="flex flex-col gap-1 rounded-md border bg-card p-3 text-sm"
            >
              {SECTION_LINKS.map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {label}
                </a>
              ))}
            </nav>
          </aside>
        ) : null}
      </div>
    </form>
  );
}
