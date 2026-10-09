/**
 * Zod schema for one raw new-database/perfumes.jsonl record (see
 * new-database/SCHEMA.md, gitignored and local-only, for the full shape).
 *
 * Only a subset of each record is kept. Dropped on purpose: `url`,
 * `picture`, `thumbnail` (derivable from `id` + `slug`, see SCHEMA.md),
 * `rating`, every histogram, `price_value`, `relation`, `community_gender`,
 * `ai_summary`, `similar`, and the extra `popularity` sub-fields, plus
 * `image_id` on perfumers and notes (Fragrantica's own portrait/icon
 * assets, irrelevant to this project). Zod strips any other unknown key by
 * default, so the schema below only needs to name what it keeps.
 */

import { z } from "zod";

const perfumerRecordSchema = z.object({
  name: z.string(),
  slug: z.string(),
});

const accordRecordSchema = z.object({
  name: z.string(),
  strength: z.number(),
});

const noteItemRecordSchema = z.object({
  name: z.string(),
  slug: z.string(),
  weight: z.number(),
});

const tieredNotesSchema = z.object({
  top: z.array(noteItemRecordSchema).default([]),
  middle: z.array(noteItemRecordSchema).default([]),
  base: z.array(noteItemRecordSchema).default([]),
});

function emptyTiered(): { top: []; middle: []; base: [] } {
  return { top: [], middle: [], base: [] };
}

const notesRecordSchema = z.object({
  tiered: tieredNotesSchema.default(emptyTiered),
  flat: z.array(noteItemRecordSchema).default([]),
});

/**
 * Only `average` is kept from longevity/sillage/popularity; their
 * histograms and other sub-fields are out of scope for this parser.
 */
const averageMetricSchema = z.object({
  average: z.number().nullable(),
});

const seasonVotesSchema = z.object({
  winter: z.number(),
  spring: z.number(),
  summer: z.number(),
  autumn: z.number(),
});

const daypartVotesSchema = z.object({
  day: z.number(),
  night: z.number(),
});

const popularityRecordSchema = z.object({
  magnitude: z.number().nullable(),
});

const metaRecordSchema = z.object({
  scraped_at: z.number().nullable().default(null),
});

/**
 * Covers only the fields this project keeps from a perfumes.jsonl record.
 *
 * `id` is typed as a bare `z.number()`, not `.int().positive()`, on purpose:
 * that keeps "the record doesn't match the schema at all" (a missing/wrong
 * -typed field) and "the record has a nonsensical id" (checked explicitly in
 * `parseReferenceRecord`) as two distinguishable failures instead of one.
 */
export const referenceRecordSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  brand: z.string(),
  year: z.number().nullable().default(null),
  gender: z.string().nullable().default(null),
  collection: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  perfumers: z.array(perfumerRecordSchema).default([]),
  accords: z.array(accordRecordSchema).default([]),
  notes: notesRecordSchema.default(() => ({ tiered: emptyTiered(), flat: [] })),
  // The vote aggregates below come from one encrypted blob upstream and go
  // null together when it is absent (see new-database/SCHEMA.md); each is
  // independently nullable here to match that.
  longevity: averageMetricSchema.nullable().default(null),
  sillage: averageMetricSchema.nullable().default(null),
  seasons: seasonVotesSchema.nullable().default(null),
  daypart: daypartVotesSchema.nullable().default(null),
  people: z.number().nullable().default(null),
  popularity: popularityRecordSchema.nullable().default(null),
  meta: metaRecordSchema.default({ scraped_at: null }),
});

export type ReferenceRecord = z.infer<typeof referenceRecordSchema>;
