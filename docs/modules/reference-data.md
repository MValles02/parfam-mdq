# Module: Fragrance reference data

## Responsibility

Import a third-party fragrance dataset into read-only reference tables
(`FragranceRef` and its relations, plus the shared `Brand`, `Perfumer`,
`Note`, and `Accord` dictionaries), gated on a complete Spanish translation
of every note and accord slug the dataset uses. The panel's product form
searches this catalog and lets an administrator "adopt" one record as the
starting point for an editable `Product`. The store never reads
`FragranceRef` directly.

## Files

| File                                               | Responsibility                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------- |
| `scripts/import-references.ts`                     | Import command (two passes, see below).                                     |
| `scripts/lib/reference-parse.ts`                   | Pure parsing and normalization of one record.                               |
| `scripts/lib/reference-import.ts`                  | Dimension aggregation and `FragranceRef` row shape shared by create/update. |
| `scripts/lib/reference-translations.ts`            | Loads and validates the translation files.                                  |
| `scripts/check-reference-translations.ts`          | Coverage report; can emit a skeleton for missing slugs.                     |
| `prisma/reference/notes.es.json`                   | Note slug → `{en, es}`.                                                     |
| `prisma/reference/accords.es.json`                 | Accord slug → `{en, es, color}`.                                            |
| `src/lib/admin/references.ts`                      | Admin search over the catalog and the adoption read path.                   |
| `src/app/admin/(panel)/productos/image-actions.ts` | `importReferencePicture`: copies one reference photo into R2 at adoption.   |

## Dataset

The importer reads `new-database/perfumes.jsonl`, one JSON object per line,
gitignored and local-only. It is the Kaggle dataset **`fragrantica-perfumes`**
(owner `ledecanteur`), currently 140,228 records. To obtain or refresh it,
download that Kaggle dataset and place `perfumes.jsonl` at the repository
root under `new-database/`. `new-database/SCHEMA.md` (also gitignored, kept
alongside the dataset) documents the raw record shape in full; this document
only lists what the importer keeps and how it normalizes it.

## Kept fields

| Dataset field                   | Stored as                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `id`                            | `FragranceRef.pid` (unique, stable across reruns).                                                |
| `slug`                          | `FragranceRef.slug` (not unique; see Normalization).                                              |
| `name`                          | `FragranceRef.name`.                                                                              |
| `brand`                         | `Brand.name`, grouped by the brand segment of `slug`.                                             |
| `year`                          | `FragranceRef.year`, or `null` with a warning if implausible.                                     |
| `gender`                        | `FragranceRef.gender` (`male`/`female`/`unisex` → `MEN`/`WOMEN`/`UNISEX`, else `null`).           |
| `collection`                    | `FragranceRef.collection`.                                                                        |
| `description`                   | `FragranceRef.descriptionEn`; English, panel-only reference text.                                 |
| `perfumers[]`                   | `Perfumer` rows and `FragranceRefPerfumer` links.                                                 |
| `accords[]` (`strength` 0..100) | `Accord` rows and `FragranceRefAccord.strength`.                                                  |
| `notes.tiered` / `notes.flat`   | `Note` rows and `FragranceRefNote.position` / `.weight` (0..100).                                 |
| `longevity.average` (1..5)      | `FragranceRef.longevity`.                                                                         |
| `sillage.average` (1..4)        | `FragranceRef.sillage`.                                                                           |
| `seasons` vote counts           | `FragranceRef.seasonSpringVotes` / `seasonSummerVotes` / `seasonFallVotes` / `seasonWinterVotes`. |
| `daypart` vote counts           | `FragranceRef.daypartDayVotes` / `daypartNightVotes`.                                             |
| `people`                        | `FragranceRef.communityVotes`; internal only.                                                     |
| `popularity.magnitude`          | `FragranceRef.popularity`; internal, ranks admin search results.                                  |
| `meta.scraped_at`               | `FragranceRef.scrapedAt`.                                                                         |

## Dropped fields

| Dataset field(s)                                                         | Reason                                                                                           |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `url`, `picture`, `thumbnail`                                            | Pure functions of `id` + `slug`; rebuilt on demand (see `image-actions.ts` for the picture URL). |
| `rating` (average and histogram)                                         | Not part of this project's scope; only `longevity`/`sillage` averages are kept.                  |
| Every histogram (`longevity`, `sillage`, `price_value`, `rating`)        | Out of scope; only the averages/vote totals are kept.                                            |
| `price_value`                                                            | Not relevant to this store's pricing, which is set by the administrator.                         |
| `relation` (have/had/want)                                               | Out of scope.                                                                                    |
| `community_gender`                                                       | Out of scope; the official `gender` label is kept instead.                                       |
| `ai_summary`                                                             | Out of scope.                                                                                    |
| `similar` (`reminds_me_of`, `also_liked`)                                | Out of scope; no "similar perfumes" feature reads the third-party carousel.                      |
| `popularity.compound_magnitude`, `.recent_magnitude`, `.last_comment_at` | Only `popularity.magnitude` is kept.                                                             |
| `perfumers[].image_id`, `notes[].image_id`                               | Fragrantica's own portrait/icon assets; irrelevant here.                                         |

## Normalization rules

- **`pid` is the stable identity.** The raw `slug` ("Brand/Name") is **not**
  unique — two records (e.g. a flanker with an identical title under the same
  brand) can share it — so the importer disambiguates by `pid`, never by
  `slug`.
- **Perfumer slugs** are derived from the dataset's own `perfumers[].slug`
  after percent-decoding it and turning `_` into a space (e.g.
  `Sophie_Labb%C3%A9` → `Sophie Labbé`), then slugified. This lets differently
  cased credits resolve to the same `Perfumer` row and avoids the unreadable
  slug that naive slugification of the raw value would produce.
- **Notes** keep the display name as their identity (`Note.slug`, derived from
  the lowercased name): two display names that share the dataset's own family
  slug (e.g. "Calabrian bergamot" and "Sicilian Bergamot" both carry family
  "Bergamot") stay distinct rows. `Note.family` stores that dataset family
  slug and drives the store's note filter. `position` is `TOP`/`MIDDLE`/`BASE`
  for a tiered pyramid, or `null` for a flat note list (`tiered` and `flat`
  are mutually exclusive per record). `weight` is 0..100, normalized so the
  perfume's strongest note is 100; a record where every note sits at 0 means
  nobody has voted on its ingredients yet, not that all notes are faint, so
  that state is preserved rather than treated as missing.
- **Longevity** (1..5) and **sillage** (1..4) averages of exactly `0` become
  `null` ("nobody has voted"); any other out-of-range average throws instead
  of being silently clamped.
- **Season and daypart vote counts** come from the same encrypted vote blob
  and go `null` together, per group, when the whole tally is unset — an
  all-zero group means "no votes", not "every option got 0%".
- **`year`** outside the plausible range (below 1500, or after next calendar
  year) is imported as `null` with a warning rather than aborting the whole
  import; two records currently trigger this (Fragrantica data-entry errors),
  while a legitimate 1533 outlier (a centuries-old recipe) stays intact.
- **`communityVotes`** (from `people`) and **`popularity`** (from
  `popularity.magnitude`) are internal: never sent to the client. `popularity`
  ranks admin search results (see `src/lib/admin/references.ts`);
  `communityVotes` also gates whether the adopted `Product`'s longevity,
  sillage, season, and daypart data is trustworthy enough to publish (see
  `docs/data-flow.md` and `src/lib/store/queries.ts`).

## Translation files

`prisma/reference/notes.es.json` and `prisma/reference/accords.es.json` are
committed, hand-edited dictionaries the importer requires before it writes
anything. Each is a JSON object keyed by slug:

- Notes: `{ "<slug>": { "en": "...", "es": "..." } }`, 2,581 entries today.
  `<slug>` must equal the slug derived from that entry's own `en` name
  (checked at load time), so a translator cannot rename `en` without the key
  going stale.
- Accords: `{ "<slug>": { "en": "...", "es": "...", "color": "#RRGGBB" } }`,
  92 entries today. `color` feeds `Accord.color` (see `src/lib/color.ts`) and
  is this project's own palette choice, not scraped data.

Workflow when the dataset introduces new slugs:

1. Run `pnpm db:check-translations` to see how many notes/accords are
   missing.
2. Run `pnpm db:check-translations --emit-missing <path>` to write a JSON
   skeleton at `<path>` with the missing slugs (sorted by how often the
   dataset uses them, most common first), each with an empty `es` (and
   `color` for accords) field ready to fill in.
3. Translate the empty fields and merge the entries into
   `prisma/reference/notes.es.json` / `accords.es.json`.
4. Re-run `pnpm db:check-translations` until it reports zero missing slugs.

`scripts/import-references.ts` runs the same coverage check as an import gate
(pass 1, below) and refuses to write to the database while any slug used by
the dataset is untranslated.

## Importer usage

```bash
pnpm db:import-references                       # full dataset
pnpm db:import-references --limit 1000           # quick check
pnpm db:import-references --batch-size 200
pnpm db:import-references --translations-dir /tmp/reference-scratch
```

pnpm forwards flags straight to the script, so no `--` separator is needed.
Flags: `--file` (default `new-database/perfumes.jsonl`), `--limit`,
`--batch-size` (default `500`), `--translations-dir` (default
`prisma/reference`).

The importer runs in two passes:

1. **Aggregate and gate.** Streams the file once to collect every brand,
   perfumer, note, and accord slug, then refuses to write anything to the
   database if any note or accord slug lacks a translation.
2. **Write.** Upserts the `Brand`/`Perfumer`/`Note`/`Accord` dimension rows
   (never deleted, since the panel may hold admin-created rows the dataset
   does not know about), then streams the file again in batches
   (`--batch-size` records per transaction), creating new `FragranceRef` rows
   and updating existing ones (matched by `pid`) in place. `id` is never
   reassigned for a `pid` that already exists — updating in place keeps
   `Product.fragranceRefId` intact across reruns, since a delete-and-recreate
   would otherwise `SetNull` it for every product an administrator already
   adopted. Each batch fully replaces its refs' note/accord/perfumer relation
   rows, so a rerun with revised weights never leaves a stale relation
   behind. `Note.usageCount` is recomputed once, after every relation row
   exists.

Each batch's transaction uses a 120-second timeout (30-second `maxWait`),
sized for running the importer from a developer machine against the
production database through an SSH tunnel (see `docs/deployment.md`), where
added latency would otherwise blow past Prisma's 5-second default. A full run
of the current 140,228-record dataset takes roughly 10 minutes locally.

## Public vs. panel-only fields

The store never queries `FragranceRef` — it is exclusively panel reference
material, searched from the product form and adopted into a `Product` copy.
Within it, `descriptionEn`, `communityVotes`, and `popularity` are explicit
internal fields never sent to the client; the rest (name, year, gender,
collection, longevity, sillage, season/daypart votes, notes, accords,
perfumers) exists only to prefill the adoption form with a starting point for
Spanish product copy.

## Adoption

`adoptReferenceAction` (`src/app/admin/(panel)/productos/actions.ts`) calls
`getReferenceForAdoption` (`src/lib/admin/references.ts`), which reads one
`FragranceRef` and returns:

- Scalars to prefill the product form: name, year, gender, collection,
  longevity/sillage (as plain numbers), and a Fragrantica-internal
  `referenceUrl` deep link shown only in the panel.
- Season and daypart vote counts converted to 0..100 percentages that sum to
  100 (largest-remainder rounding, see `toPercentages`); a whole group stays
  `null` when its votes are unset.
- Notes (Spanish name, position, weight) and accords (Spanish name, color,
  strength) with their reference IDs, for the pyramid and accord editors.
- Perfumer names, normalized for display (see `formatProperName`, and
  finding F-21 in `docs/findings.md` for why the stored casing is
  inconsistent).
- `descriptionEn`, the internal Fragrantica copy, shown to the administrator
  only as a reference for writing the Spanish description.

The administrator edits this prefilled data (including rewriting the
description in Spanish) before submitting the product form. The save action
re-verifies every note, accord, and perfumer ID against the database and
copies `FragranceRef.communityVotes` itself server-side — the client never
supplies it — so `Product.communityVotes` cannot be forged or left stale.

`importReferencePicture` (`src/app/admin/(panel)/productos/image-actions.ts`)
separately copies the reference's single bottle photo into R2 the first time
an administrator asks for it. It never fires automatically on adoption and
never hotlinks the third-party host: see `docs/integrations.md` for the fetch
and upload path.
