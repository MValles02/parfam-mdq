# Findings

This document records repository-level findings that matter when changing the
application. Resolved items describe the current safeguards, while open items
describe operational constraints rather than customer-facing behavior.

## Resolved safeguards

| Area                     | Current safeguard                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sitemap freshness        | Product mutations revalidate the sitemap tag and relevant public routes.                                                                          |
| WhatsApp return link     | The thank-you page accepts only a valid `https://wa.me/` link.                                                                                    |
| R2 cleanup               | Product image deletion removes unreferenced keys after the database transaction commits. Shared keys survive until their final reference is gone. |
| Note and brand freshness | Related public pages are revalidated after translation or display-name changes.                                                                   |
| Action envelopes         | Admin actions use shared `ActionResult<T>` and `fieldErrors()`. Raw Spanish fields remain at the client boundary.                                 |
| Cart compatibility       | Persisted cart version 2 migrates legacy image fields to the English internal model.                                                              |
| Public action safety     | Checkout uses a honeypot, request validation, price rereads, and rate limiting.                                                                   |
| Product safety           | Publication checks, relationship ID validation, product ownership checks, and R2 key validation run server-side.                                  |

## Open operational considerations

| Topic              | Current behavior                                                     | Follow-up when needed                                                       |
| ------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Rate limiting      | `src/lib/rate-limit.ts` is in-memory and process-local.              | Move counters to shared storage before horizontal scaling.                  |
| Catalog sorting    | Catalog query behavior is sufficient for the current product volume. | Move expensive ordering/filtering fully to SQL if data volume requires it.  |
| Background cleanup | R2 cleanup is best effort after database writes.                     | Add reconciliation tooling if orphaned object cost becomes material.        |
| Test coverage      | Unit tests cover parser and cart migration behavior.                 | Add focused integration/e2e coverage when workflows become more complex.    |
| CI validation      | CI builds and publishes.                                             | Run typecheck, lint, and tests in CI when the release pipeline is expanded. |

## Presentation-only price arithmetic

Checkout and cart components use `Number()` for display totals in
`src/app/(store)/checkout/_components/checkout-form.tsx`,
`src/components/store/cart/cart-summary.tsx`, and
`src/components/store/cart/cart-item-row.tsx`. This is an intentional
presentation exception to the Decimal rule. Prices still cross to the client
as strings, writing actions reread prices from the database, and persisted
order totals use `Prisma.Decimal` on the server.

## Refactoring constraints

Historical Prisma migrations, Spanish public routes, query keys, raw action
payloads, localStorage keys, R2 prefixes, WhatsApp placeholders, and
environment variables are external or persisted contracts. Keep them stable, or
introduce an explicit migration or adapter.

The code is the authoritative source. Refresh this document whenever an
implementation change invalidates one of these statements.
