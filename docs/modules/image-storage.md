# Module: image storage

## Responsibility

Store product-image objects in Cloudflare R2 through presigned browser uploads, while retaining authorization and key validation on the server.

## Files

- src/lib/r2.ts: lazy client configuration, public URL helper, signed uploads,
  server-side uploads (`putR2Object`), deletion, key generation
  (`createProductStorageKey`), and `isProductStorageKey`.
- src/lib/image-type.ts: accepted MIME types, the 8 MB limit, and magic-byte
  format detection.
- src/lib/image-trim.ts: white-margin trimming for imported reference photos.
- src/app/admin/(panel)/productos/image-actions.ts: protected upload and temporary-delete actions.
- src/app/admin/(panel)/productos/actions.ts: persisted-image cleanup.
- src/app/admin/(panel)/productos/_components/image-panel.tsx: UI.

## Rules

The server generates UUID keys under `products/`; the database stores a storage
key, never a public URL. Signed uploads whitelist JPEG, PNG, WebP, and AVIF and
enforce the 8 MB limit. Any browser-supplied deletion key must pass
`isProductStorageKey`. Orphan cleanup is best effort because a committed
database change must not be rolled back after an object-delete failure.

`importReferencePicture` (also in `image-actions.ts`) is a separate path: it
fetches one reference fragrance's bottle photo server-side and copies it into
R2, rather than accepting a browser-presigned upload. It only runs when the
administrator explicitly asks for it after adoption, never automatically, and
never hotlinks the third-party host (see `docs/integrations.md`).

Before that upload, `src/lib/image-trim.ts` uses `sharp` to trim the wide
white margins around the downloaded bottle photo, adds back a small uniform
white pad, and re-encodes as JPEG (mozjpeg, quality ~90) so the store's white
background still composites correctly. Trimming is best effort: it falls
back to the original, already-validated bytes whenever the crop found
nothing to trim, shrank the image below a usable size, or the input didn't
decode at all. This module has no Prisma dependency and must never be
imported by a Client Component.
