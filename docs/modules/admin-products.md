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
- src/lib/validations/product.ts: input schema and publish constraints.
- src/app/admin/(panel)/productos/actions.ts: protected Server Actions.
- src/app/admin/(panel)/productos/_components/product-form.tsx: form orchestration.
- src/app/admin/(panel)/productos/image-actions.ts: direct-upload signing.

## Rules

Actions start with requireAdmin(). Product, note, accord, perfumer, variant, and storage-key IDs are verified server-side. ARS prices are stored as Prisma Decimal values. Publishing revalidates catalog, product, brand, and sitemap cache data.

The route and URL values remain compatibility data, and panel copy remains
Spanish. Action results use English `data`, `message`, and `fieldErrors` keys.
