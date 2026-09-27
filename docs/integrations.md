# Integrations

## Cloudflare R2

`src/lib/r2.ts` creates the S3-compatible client lazily and exposes signed PUT
URLs, public URL construction, key validation, and deletion. Upload actions
allow only approved MIME types and enforce the configured size limit before a
URL is signed, and that validated size is bound into the signature itself:
`getUploadUrl` sets `ContentLength` on the `PutObjectCommand` and signs it
(alongside `Content-Type`) via `signableHeaders`, so the resulting URL only
accepts a PUT body of exactly the size the server checked, not an arbitrary
one sent within the URL's expiration window.

Product image keys use `products/`; development seed images use
`products/dev/`. The fresh prelaunch database has no rows with old
`productos/` keys. Any deployed database still storing those keys must be
reset or migrated before this version is deployed. Existing R2 objects under
that old prefix can be deleted after confirming no deployed instance still
uses them. Database rows store a key, then public views derive the URL from
`R2_PUBLIC_URL`.

Local development and production currently configure the same `R2_BUCKET` —
there is no separate development bucket or dev-only prefix beyond
`products/dev/`. This makes any cleanup that deletes bucket keys unreferenced
by one database's rows unsafe to run against production alone; see the open
finding "Development and production share the R2 bucket" in
`docs/findings.md`.

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

## Security headers

`next.config.ts`'s `headers()` applies five headers to every route
(`source: "/(.*)"`): `Content-Security-Policy`, `X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`. They are set in
`next.config.ts` rather than `src/proxy.ts` because a nonce-based CSP requires
every page to render dynamically (see the "Static vs Dynamic Rendering"
section of `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`),
which would disable static generation and CDN caching for the storefront, and
because `src/proxy.ts`'s matcher only covers `/admin/:path*`.

The CSP allows exactly these origins, beyond `'self'`:

- `'unsafe-inline'` for `script-src` and `style-src`, the tradeoff for not
  using a nonce (see above).
- `'unsafe-eval'` in `script-src`, only when `NODE_ENV === "development"`
  (React's development error-stack reconstruction needs it; see the CSP doc's
  "Development vs Production Considerations" section).
- The Umami origin (`new URL(NEXT_PUBLIC_UMAMI_URL).origin`), in `script-src`
  and `connect-src`, when `NEXT_PUBLIC_UMAMI_URL` is set: the tracking script
  in `src/app/(store)/layout.tsx` loads from and reports to that origin.
- The R2 public origin (derived from `R2_PUBLIC_URL`, the same value behind
  `imageHosts` above), in `img-src`, so `next/image` can fetch product photos
  it optimizes.
- `https://*.r2.cloudflarestorage.com`, in `connect-src`: admin image uploads
  PUT directly from the browser to a presigned URL on this account-scoped R2
  endpoint (`getUploadUrl` in `src/lib/r2.ts`, the `XMLHttpRequest` in
  `image-panel.tsx`), a different host than the public `R2_PUBLIC_URL`.
- `https://static.cloudflareinsights.com`, in `script-src`, and
  `https://cloudflareinsights.com`, in `connect-src`, unconditionally (both
  production and development): Cloudflare injects its Web Analytics beacon
  script from the first origin and it reports to the second at the edge, in
  front of this deployment, so neither call appears anywhere in this app's
  source.

Both the Umami and R2 origins are resolved from build-time environment
variables, the same way `imageHosts` is, so changing `NEXT_PUBLIC_UMAMI_URL`
or `R2_PUBLIC_URL` requires a rebuild, not just a Dokploy environment update.

HSTS (`Strict-Transport-Security`) is intentionally not set by the
application; Cloudflare adds it at the edge in front of this deployment.

## Environment contract

Environment-variable names are integration and deployment contracts. Preserve
their names when refactoring application code. Add an explicit compatibility
plan before changing a variable consumed by Docker, CI, Dokploy, R2, Auth.js, or
a third party.
