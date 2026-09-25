# Flow: upload a product image

## Purpose

Upload a panel-selected image directly to Cloudflare R2 while keeping signing,
key generation, MIME checks, and deletion authorization on the server.

## Flow

1. `ImagePanel` sends the file name, MIME type, and byte count to
   `requestUploadUrl`.
2. The action begins with `requireAdmin()`, validates the request, verifies
   R2 configuration, and generates a UUID-based key under `products/`.
3. The browser uploads directly to the presigned URL with the allowed
   `Content-Type`.
4. The form saves the returned storage key as a `ProductImage` row; the key,
   rather than a public URL, is persisted.
5. If the user discards an unsaved upload, `deleteUploadedImage` first checks
   `isProductStorageKey` and then removes the R2 object.
6. After product persistence, `saveProduct` removes unreferenced keys on a
   best-effort basis. Shared keys from duplicate products remain until their
   final database reference disappears.

## Main files

| Responsibility                | File                                                          |
| ----------------------------- | ------------------------------------------------------------- |
| R2 helpers and key validation | `src/lib/r2.ts`                                               |
| Signed upload actions         | `src/app/admin/(panel)/productos/image-actions.ts`            |
| Image editor                  | `src/app/admin/(panel)/productos/_components/image-panel.tsx` |
| Product persistence           | `src/app/admin/(panel)/productos/actions.ts`                  |

## Constraints

Allowed formats are JPEG, PNG, WebP, and AVIF; the maximum file size is 8 MB.
The action uses `fileName`, `sizeBytes`, and `uploadUrl`. Its generated R2 keys
start with `products/`. A database that still references old `productos/`
objects must be reset or migrated before deployment.

## Related documentation

- [Image storage module](../modules/image-storage.md)
- [Publish product flow](publish-product.md)
