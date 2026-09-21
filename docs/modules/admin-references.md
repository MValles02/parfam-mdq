# Module: administration references

## Responsibility

Search the imported Fragrantica reference catalog and provide a safe adoption DTO for the product editor. Reference data guides panel work; it is never public store content.

## API

- searchReferences(query) returns ranked ReferenceSearchResult values.
- getReferenceForAdoption(id) returns one AdoptableReference.
- Server Action wrappers validate the request and call requireAdmin().

## Files

| File                                                           | Responsibility                    |
| -------------------------------------------------------------- | --------------------------------- |
| src/lib/admin/references.ts                                    | SQL search, ranking, adoption DTO |
| src/app/admin/(panel)/productos/actions.ts                     | Action boundary                   |
| src/app/admin/(panel)/productos/_components/reference-step.tsx | Form step                         |

## Query behavior

Search normalizes terms and ranks a blend of text similarity and reference rating. The large catalog uses PostgreSQL search capabilities instead of loading every reference into the application. Imported descriptions and images remain internal data; Spanish product copy is authored by the administrator.
