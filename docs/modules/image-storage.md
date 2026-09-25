# Module: image storage

## Responsibility

Store product-image objects in Cloudflare R2 through presigned browser uploads, while retaining authorization and key validation on the server.

## Files

- src/lib/r2.ts: client configuration, public URL helper, signing, deletion, and isProductStorageKey.
- src/app/admin/(panel)/productos/image-actions.ts: protected upload and temporary-delete actions.
- src/app/admin/(panel)/productos/actions.ts: persisted-image cleanup.
- src/app/admin/(panel)/productos/_components/image-panel.tsx: UI.

## Rules

The server generates UUID keys under `products/`; the database stores a storage
key, never a public URL. Signed uploads whitelist JPEG, PNG, WebP, and AVIF and
enforce the 8 MB limit. Any browser-supplied deletion key must pass
`isProductStorageKey`. Orphan cleanup is best effort because a committed
database change must not be rolled back after an object-delete failure.
