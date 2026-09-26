# Integrations

## Cloudflare R2

`src/lib/r2.ts` creates the S3-compatible client lazily and exposes signed PUT
URLs, public URL construction, key validation, and deletion. Upload actions
allow only approved MIME types and enforce the configured size limit before a
URL is signed.

Product image keys use `products/`; development seed images use
`products/dev/`. The fresh prelaunch database has no rows with old
`productos/` keys. Any deployed database still storing those keys must be
reset or migrated before this version is deployed. Existing R2 objects under
that old prefix can be deleted after confirming no deployed instance still
uses them. Database rows store a key, then public views derive the URL from
`R2_PUBLIC_URL`.

`R2_BUCKET` currently names a bucket linked to the public image host. Its
Spanish resource name can stay because it is an external infrastructure
identifier. Renaming it requires creating a new bucket, configuring public
access and the hostname, then updating `R2_BUCKET` and `R2_PUBLIC_URL` together.

Required values are documented in `.env.example`:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL`

## Reference picture import (fimgs.net)

`importReferencePicture`
(`src/app/admin/(panel)/productos/image-actions.ts`) copies a single bottle
photo from Fragrantica's image host into R2 the first time an administrator
asks for it while adopting a reference. The client only supplies a
`FragranceRef` id; the download URL is always built server-side from that
row's `pid` as `https://fimgs.net/mdimg/perfume/375x500.{pid}.jpg` — never
from client-supplied input, and never as a stored hotlink (`ProductImage`
only ever holds an R2 key, see `docs/persistence.md`). This is a one-time
copy per adoption, not a bulk importer: Fragrantica images stay internal
reference material (see `AGENTS.md`) and this project never scrapes them in
bulk.

The fetch: a 10-second timeout, a redirect mode of `manual` (a redirect is
treated as failure rather than followed), and an 8 MB cap enforced while
streaming the response body (aborting the read as soon as the cap is
crossed, so an oversized or `Content-Length`-less response cannot be
buffered whole). The downloaded bytes are then magic-byte validated the same
way a manual upload is (`detectImageContentType`, see `src/lib/image-type.ts`)
— the response's declared `Content-Type` is never trusted for that decision.
Before upload, `trimWhiteMargins` (`src/lib/image-trim.ts`) crops the wide
white margins fimgs.net leaves around the bottle using `sharp`, adds back a
small white pad, and re-encodes as JPEG; it falls back to the original,
already-validated bytes whenever trimming doesn't clearly help, so it can
never turn a valid download into an upload failure. Only then is the file
uploaded to R2 via `putR2Object` under a fresh generated key, exactly like a
manual image upload.

`next.config.ts`'s `images.remotePatterns` is built only from
`R2_PUBLIC_URL`; fimgs.net is never added to it, because the app never
renders a fimgs.net URL directly — the copied file is always served back
from R2 like any other product image.

## WhatsApp

`src/lib/whatsapp.ts` validates the configured destination, builds `wa.me`
URLs, and formats customer phone numbers. `src/lib/store/order-message.ts`
expands the `SiteSetting` WhatsApp template after checkout.

Template placeholders such as `{{marca}}`, `{{items}}`, `{{total}}`,
`{{nombre}}`, and `{{numero}}` are persisted customer-facing configuration.
Keep them unchanged unless a data migration and compatible renderer are added.

## Authentication

Auth.js uses `AUTH_SECRET` and `AUTH_TRUST_HOST`. The credentials provider
reads the administrator from PostgreSQL and verifies an argon2 password hash.
See [authentication.md](authentication.md).

## Analytics and external media

Umami values prefixed with `NEXT_PUBLIC_` are embedded at build time. Remote
image configuration is built from `R2_PUBLIC_URL`. Update those build-time
values in CI as well as the deployment environment.

## Environment contract

Environment-variable names are integration and deployment contracts. Preserve
their names when refactoring application code. Add an explicit compatibility
plan before changing a variable consumed by Docker, CI, Dokploy, R2, Auth.js, or
a third party.
