# Architecture documentation audit guide

## Purpose

Use this guide when reviewing or updating the technical documentation in this directory. Document the behavior implemented in code, rather than assumptions derived from filenames or prior documentation.

## Scope

The repository is one Next.js application: public store routes and administration routes run in the same process, using PostgreSQL through Prisma and Cloudflare R2 for product images. It has no payment provider; checkout creates an order and opens a WhatsApp link.

## Required review method

1. Inspect project manifests, runtime configuration, Prisma schema, application routes, and scripts.
2. Inventory entry surfaces: App Router routes, Server Actions, API routes, proxy authorization, CLI scripts, and deployment entrypoints.
3. Trace each important user flow from route or UI through validation, query/action, persistence, integrations, response, cache invalidation, and UI update.
4. Confirm all documented behavior against current code. When documentation and code disagree, update documentation to match code.
5. Record concrete risks in findings.md with the affected path and observed behavior.

## Documentation requirements

- Keep developer prose, identifiers, diagrams, and instructions in English.
- Keep Spanish customer UI strings, es-AR examples, public routes, URL keys, raw action fields, storage keys, template placeholders, and other external contracts unchanged.
- Document why authorization, Decimal pricing, snapshot persistence, published-product filtering, and browser-input validation exist.
- Link to actual files and current exported APIs. Do not treat historical migration filenames or generated output as implementation naming guidance.

## Validation

Use targeted searches for routes, exported functions, imports, environment variables, and schema fields. Run the repository checks when a documentation update accompanies code changes: pnpm format, pnpm typecheck, pnpm lint, pnpm test, and pnpm build.
