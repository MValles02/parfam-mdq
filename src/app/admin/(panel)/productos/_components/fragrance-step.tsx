"use client";

import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormSetValue,
} from "react-hook-form";
import { Field } from "@/components/admin/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Concentration, Gender } from "@/generated/prisma/enums";
import {
  CONCENTRATION_LABELS as concentrationLabels,
  GENDER_LABELS as genderLabels,
} from "@/lib/catalog";
import type { ProductFormInput } from "@/lib/validations/product";
import {
  AccordSelector,
  type Accord,
  type SelectedAccord,
} from "./accord-selector";
import { BrandField } from "./brand-field";
import { NullableEnumSelect } from "./nullable-enum-select";
import { PerfumerField } from "./perfumer-field";
import type { NameEntry, NamesById } from "./product-form-values";
import { ProfileFields } from "./profile-fields";
import { PyramidEditor, type SelectedNote } from "./pyramid-editor";
import type { AdoptedReference } from "./reference-step";
import { Step } from "./step";

/** `NullableEnumSelect` values standing for "Sin especificar". */
const NO_CONCENTRATION = "__ninguna";
const NO_GENDER = "__ninguno";

/**
 * Step 2 of the product form: identity, customer description, notes,
 * accords, and profile. Fields prefilled by an adopted reference show the
 * "AUTO" badge.
 */
export function FragranceStep({
  control,
  setValue,
  errors,
  adoptedReference,
  referenceText,
  accords,
  names,
  onNamesChange,
  communityVotes,
}: {
  control: Control<ProductFormInput>;
  setValue: UseFormSetValue<ProductFormInput>;
  errors: FieldErrors<ProductFormInput>;
  adoptedReference: AdoptedReference | null;
  /** Internal English description of the adopted reference, never published. */
  referenceText: string | null;
  accords: Accord[];
  names: NamesById;
  onNamesChange: (entries: NameEntry[]) => void;
  communityVotes: number | null | undefined;
}) {
  const isAutofilled = Boolean(adoptedReference);

  return (
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
          isAutofilled={isAutofilled}
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

        <BrandField
          control={control}
          setValue={setValue}
          isAutofilled={isAutofilled}
          error={errors.brandName?.message}
        />

        <Field
          label="Año"
          htmlFor="year"
          isAutofilled={isAutofilled}
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
              <NullableEnumSelect
                value={field.value}
                onChange={field.onChange}
                options={Object.values(Concentration)}
                labels={concentrationLabels}
                noneValue={NO_CONCENTRATION}
              />
            )}
          />
        </Field>

        <Field
          label="Género"
          isAutofilled={isAutofilled}
          error={errors.gender?.message}
        >
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <NullableEnumSelect
                value={field.value}
                onChange={field.onChange}
                options={Object.values(Gender)}
                labels={genderLabels}
                noneValue={NO_GENDER}
              />
            )}
          />
        </Field>

        <PerfumerField
          control={control}
          names={names}
          onNamesChange={onNamesChange}
          isAutofilled={isAutofilled}
        />
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
              Ver el texto en inglés de la referencia (interno, no se publica)
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
                onNamesChange(
                  notes.map((note) => [note.noteId, note.name] as const),
                );
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
        <Field label="Acordes" isAutofilled={isAutofilled}>
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

      <ProfileFields
        control={control}
        errors={errors}
        isAutofilled={isAutofilled}
        communityVotes={communityVotes}
      />
    </Step>
  );
}
