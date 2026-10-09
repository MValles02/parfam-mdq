# Module: administration products

## Responsibility

Create, edit, duplicate, delete, and publish store products while validating all browser input and keeping public cache output current.

## API

| API                             | Responsibility                              |
| ------------------------------- | ------------------------------------------- |
| listProducts                    | Product list, counts, active starting price |
| getProductForEdit               | Form DTO for an existing product            |
| saveProduct                     | Create or update product and relations      |
| duplicateProduct, deleteProduct | Protected product lifecycle operations      |
| productSchema                   | Shared client/server validation contract    |

## Files

- src/lib/admin/products.ts: panel queries and DTOs.
- src/lib/admin/product-list-params.ts: nuqs parsers (`q`, `estado`) shared by the list page.
- src/lib/validations/product.ts: input schema and publish constraints.
- src/app/admin/(panel)/productos/actions.ts: protected Server Actions.
- src/app/admin/(panel)/productos/_components/product-form.tsx: form orchestration.
- src/app/admin/(panel)/productos/image-actions.ts: direct-upload signing.

## Rules

Actions start with requireAdmin(). Product, note, accord, perfumer, variant, and storage-key IDs are verified server-side. ARS prices are stored as Prisma Decimal values. Publishing revalidates catalog, product, brand, sitemap, and "Se parece a" cache data.

The list shows per row: presentations (active variants), a "Ficha" completeness bar (active variant and description are the publish rule; primary photo is only a recommendation), a read-only status chip and a Visible switch that calls `changeProductStatus`. The table scrolls inside its own wrapper so the page never overflows at 390 px.

The "Perfil" section holds weights (pyramid position or flat-list note weights, accord strength), longevity, sillage, and season/daypart percentages; there are no season or occasion checkboxes, and intensity (1..5) is always administrator-entered rather than derived from reference data. Adopting a reference also lets the administrator import its single reference picture into R2 (`importReferencePicture` in `productos/image-actions.ts`); the save buttons stay disabled while that import is in flight.

The route and URL values remain compatibility data, and panel copy remains
Spanish. Action results use English `data`, `message`, and `fieldErrors` keys.

The edit form has a sticky top header (crumb, status chip, unsaved-changes hint, "Vista previa" for published products only, Guardar keeps the current status, Publicar for drafts) and a right-hand aside with the "Para publicar" checklist (name and brand, active variant, description), the publication summary and a section nav. Sections have anchor ids: basicos, fotos, precios, descripcion, perfil, mas-datos.
