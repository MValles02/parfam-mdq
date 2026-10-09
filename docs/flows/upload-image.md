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
   `isProductStorageKey`, refuses keys that a `ProductImage` row still
   references, and then removes the R2 object.
6. After product persistence, `saveProduct` removes unreferenced keys on a
   best-effort basis. Shared keys from duplicate products remain until their
   final database reference disappears.
7. `importReferencePicture` is a separate path that runs once on each
   reference adoption: it copies that reference's bottle photo from the
   third-party host into R2 and appends it to the product's images, and the
   form disables saving while the import is in flight. Adopting another
   reference or unlinking discards an unsaved imported photo
   (`use-reference-adoption.ts`).

## Main files

| Responsibility                | File                                                          |
| ----------------------------- | ------------------------------------------------------------- |
| R2 helpers and key validation | `src/lib/r2.ts`                                               |
| Signed upload actions         | `src/app/admin/(panel)/productos/image-actions.ts`            |
| Image editor                  | `src/app/admin/(panel)/productos/_components/image-panel.tsx` |
| Image list rules              | `src/app/admin/(panel)/productos/_components/image-list.ts`   |
| Product persistence           | `src/app/admin/(panel)/productos/product-persistence.ts`      |

## Constraints

Allowed formats are JPEG, PNG, WebP, and AVIF; the maximum file size is 8 MB
(`MAX_IMAGE_BYTES` in `src/lib/image-type.ts`, shared by the server checks and
the panel dropzone).
The action uses `fileName`, `sizeBytes`, and `uploadUrl`. Its generated R2 keys
start with `products/`. A database that still references old `productos/`
objects must be reset or migrated before deployment.

## Related documentation

- [Image storage module](../modules/image-storage.md)
- [Publish product flow](publish-product.md)
