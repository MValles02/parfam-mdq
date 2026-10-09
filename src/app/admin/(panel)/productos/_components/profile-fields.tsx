"use client";

import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Field } from "@/components/admin/field";
import { Input } from "@/components/ui/input";
import {
  DAYPART_KEYS as daypartKeys,
  DAYPART_LABELS as daypartLabels,
  LONGEVITY_LABELS as longevityLabels,
  SEASON_KEYS as seasonKeys,
  SEASON_LABELS as seasonLabels,
  SILLAGE_LABELS as sillageLabels,
  type DaypartKey,
  type SeasonKey,
} from "@/lib/catalog";
import type { ProductFormInput } from "@/lib/validations/product";
import { CharacteristicBar } from "./characteristic-bar";
import { PercentageField, type PercentageFieldName } from "./percentage-field";

/** Maps each `SeasonKey` (used for shared labels) to its form field. */
const SEASON_FIELD_NAMES: Record<SeasonKey, PercentageFieldName> = {
  spring: "seasonSpring",
  summer: "seasonSummer",
  fall: "seasonFall",
  winter: "seasonWinter",
};

/** Maps each `DaypartKey` (used for shared labels) to its form field. */
const DAYPART_FIELD_NAMES: Record<DaypartKey, PercentageFieldName> = {
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

/**
 * The "Perfil" block: season and daypart percentages, collection, the
 * two-decimal community scores, and the administrator-set intensity.
 */
export function ProfileFields({
  control,
  errors,
  isAutofilled,
  communityVotes,
}: {
  control: Control<ProductFormInput>;
  errors: FieldErrors<ProductFormInput>;
  isAutofilled: boolean;
  /** Shown for context when the saved product has community votes. */
  communityVotes: number | null | undefined;
}) {
  return (
    <div id="perfil" className="mt-5 flex scroll-mt-24 flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
          Perfil
        </span>
        {communityVotes ? (
          <span className="text-xs text-muted-foreground">
            Votos de la comunidad: {communityVotes}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {seasonKeys.map((key) => (
          <PercentageField
            key={key}
            control={control}
            name={SEASON_FIELD_NAMES[key]}
            label={seasonLabels[key]}
          />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {daypartKeys.map((key) => (
          <PercentageField
            key={key}
            control={control}
            name={DAYPART_FIELD_NAMES[key]}
            label={daypartLabels[key]}
          />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Colección"
          htmlFor="collection"
          isAutofilled={isAutofilled}
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

        <CommunityScoreField
          control={control}
          name="longevity"
          label="Duración (longevidad)"
          max={5}
          hint={LONGEVITY_HINT}
          isAutofilled={isAutofilled}
          error={errors.longevity?.message}
        />

        <CommunityScoreField
          control={control}
          name="sillage"
          label="Estela (sillage)"
          max={4}
          hint={SILLAGE_HINT}
          isAutofilled={isAutofilled}
          error={errors.sillage?.message}
        />
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
  );
}

/** Two-decimal 1..`max` score input for longevity or sillage. */
function CommunityScoreField({
  control,
  name,
  label,
  max,
  hint,
  isAutofilled,
  error,
}: {
  control: Control<ProductFormInput>;
  name: "longevity" | "sillage";
  label: string;
  max: number;
  hint: string;
  isAutofilled: boolean;
  error?: string;
}) {
  return (
    <Field
      label={label}
      htmlFor={name}
      isAutofilled={isAutofilled}
      error={error}
      hint={hint}
    >
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Input
            id={name}
            type="number"
            step={0.01}
            min={1}
            max={max}
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
  );
}
