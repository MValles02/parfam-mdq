# Module: administration references

## Responsibility

Search the imported Fragrantica reference catalog and provide a safe adoption DTO for the product editor. Reference data guides panel work; it is never public store content.

## API

- searchReferences(query) returns ranked ReferenceSearchResult values (at most 12).
- getReferenceForAdoption(id) returns one AdoptableReference, with season and daypart vote counts converted to percentages by toPercentages.
- getFragranticaPerfumeUrl(slug, pid) builds the panel-only link to the source page, also used by getProductForEdit.
- Server Action wrappers validate the request and call requireAdmin().

## Files

| File                                                                  | Responsibility                    |
| --------------------------------------------------------------------- | --------------------------------- |
| src/lib/admin/references.ts                                           | SQL search, ranking, adoption DTO |
| src/app/admin/(panel)/productos/actions.ts                            | Action boundary                   |
| src/app/admin/(panel)/productos/_components/reference-step.tsx        | Form step                         |
| src/app/admin/(panel)/productos/_components/use-reference-adoption.ts | Adopt/unlink state in the form    |

## Query behavior

Search normalizes terms and ranks a 75/25 blend of `pg_trgm` trigram similarity and the dataset's own popularity signal. The large catalog uses PostgreSQL search capabilities instead of loading every reference into the application. Imported descriptions and images remain internal data; Spanish product copy is authored by the administrator.

`searchReferencesAction` merges `existingProducts: {id, name}[]` (from `findProductsByFragranceRefIds`) into each result. It is an array because `Product.fragranceRefId` is indexed but not unique.

## Community-derived fields

Adoption prefills longevity, sillage, and the season and daypart percentages from community votes, and `saveProduct` copies `communityVotes` from the linked `FragranceRef` (it is never client-submitted). Unlinking the reference clears those eight form fields (`COMMUNITY_DERIVED_FIELDS` in `productos/_components/product-form-values.ts`), because a product saved without a reference has null `communityVotes` and would otherwise publish community numbers with no source.
