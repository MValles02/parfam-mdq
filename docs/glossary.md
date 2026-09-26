# Glossary

## Fragrance domain

| Customer term | Technical model | Meaning                                          |
| ------------- | --------------- | ------------------------------------------------ |
| Frasco entero | FULL_BOTTLE     | Sealed original bottle.                          |
| Tester        | TESTER          | Original fragrance in simpler retail packaging.  |
| Decant        | DECANT          | Small transferred sample for trying a fragrance. |
| Nota          | Note            | An olfactory ingredient.                         |
| Acorde        | Accord          | A colored olfactory family.                      |
| Pirámide      | NotePosition    | Top, middle, and base note grouping.             |
| Perfumista    | Perfumer        | Fragrance creator.                               |

These Spanish terms are customer or domain terminology; internal models and implementation identifiers remain English.

## Data model

| Model                  | Responsibility                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| FragranceRef           | Internal imported reference fragrance, never public directly; its picture can be copied into a `Product`'s R2 images on adoption. |
| Brand                  | Shared brand for references and store products.                                                                                   |
| Note, Accord, Perfumer | Shared controlled vocabularies.                                                                                                   |
| Product                | Administrator-authored sellable product.                                                                                          |
| ProductVariant         | Sellable presentation and ARS price.                                                                                              |
| ProductImage           | R2 storage key plus display metadata.                                                                                             |
| Order, OrderItem       | Immutable checkout order and item snapshots.                                                                                      |
| SiteSetting            | Singleton editable site configuration.                                                                                            |
| User                   | The single administrator account.                                                                                                 |

## Naming and compatibility

| Category          | Convention                                                             |
| ----------------- | ---------------------------------------------------------------------- |
| Implementation    | English names, types, comments, logs, and developer documentation.     |
| Customer UI       | Spanish es-AR copy, including voseo and accessible labels.             |
| Public URLs       | Existing Spanish paths such as /producto, /marca, and /carrito.        |
| URL filters       | Existing keys such as genero, presentacion, and orden.                 |
| Stored cart       | parfam-cart; earlier browser cart data was discarded.                  |
| Prices            | ARS Prisma Decimal values, serialized as strings to client components. |
| WhatsApp template | {{marca}}, {{items}}, {{total}}, {{nombre}}, and {{numero}}.           |

## Common abbreviations

| Abbreviation  | Meaning                                          |
| ------------- | ------------------------------------------------ |
| ARS           | Argentine peso; prices use Decimal, never float. |
| E.164         | International stored phone format.               |
| EDP, EDT, EDC | Eau de Parfum, Eau de Toilette, Eau de Cologne.  |
| OG            | Open Graph preview metadata.                     |
| R2            | Cloudflare S3-compatible object storage.         |
| RSC           | React Server Component.                          |
| GHCR          | GitHub Container Registry.                       |
