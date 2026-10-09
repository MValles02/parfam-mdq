# Flow: create and publish a product

## Purpose

Let an administrator adopt reference data or enter product data manually, save a
draft, upload images, define sellable variants, and publish only valid products.

## Entry points

The panel uses the preserved routes `/admin/productos/nuevo` and
`/admin/productos/[id]`. `ProductForm` is an internal component in
`src/app/admin/(panel)/productos/_components/product-form.tsx`.

## Flow

1. The administrator can search reference fragrances with
   `searchReferencesAction` and import one through `adoptReferenceAction`,
   which prefills the "Perfil" section (note/accord weights, longevity,
   sillage, season/daypart percentages), collection, and perfumers; the
   administrator can then also copy the reference's bottle photo into R2
   with `importReferencePicture`, which disables saving until it finishes.
2. `ProductForm` validates `productSchema` on the client, but
   `saveProduct` validates the same schema at the server boundary.
3. The form accepts details, notes, accords, perfumers, characteristics, images,
   and variants. IDs arriving from the browser are checked against the database.
4. Image uploads obtain a presigned R2 URL from `requestUploadUrl`; the server
   creates and validates the storage key before persistence.
5. `saveProduct` synchronizes related rows in a transaction and revalidates
   affected store, brand, catalog, and sitemap output.
6. A product can be published only when it satisfies the validation rules and
   has at least one active variant. The public query independently filters to
   `PUBLISHED` products and `isActive` variants.

## Main files

| Responsibility   | File                                               |
| ---------------- | -------------------------------------------------- |
| Product queries  | `src/lib/admin/products.ts`                        |
| Reference search | `src/lib/admin/references.ts`                      |
| Shared schema    | `src/lib/validations/product.ts`                   |
| Product actions  | `src/app/admin/(panel)/productos/actions.ts`       |
| Upload actions   | `src/app/admin/(panel)/productos/image-actions.ts` |
| Form components  | `src/app/admin/(panel)/productos/_components/`     |

## Contracts and safety

Every mutating action begins with `requireAdmin()`. UI messages and field
labels remain Spanish. The action envelope uses `data`, `message`, and
`fieldErrors`; uploads use `fileName`, `sizeBytes`, and `uploadUrl`. R2 product
objects use the `products/` prefix.

## Related documentation

- [Admin products module](../modules/admin-products.md)
- [Reference data module](../modules/reference-data.md)
- [Image storage module](../modules/image-storage.md)

The new-product step offers two radio cards ("Buscar en la referencia" / "Empezar de cero"). Selecting a search result fetches the adoptable payload and shows a preview card; "Usar estos datos" then prefills the form. When a product already links to that reference, the result is marked "Ya lo tenés" and the preview links to the existing product.
