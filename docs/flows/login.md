# Flow: sign in to the administration panel

## Purpose

Authenticate the single panel administrator and return them to the requested admin page.

## Flow

1. `src/proxy.ts` optimistically redirects unauthenticated `/admin/*` requests to `/admin/login?volverA=<original path>`.
2. `LoginForm` posts to the login Server Action with the preserved `volverA` boundary field.
3. The action validates input, applies an IP and email rate limit, then calls Auth.js Credentials `signIn` without a framework redirect.
4. The credentials provider looks up `User` by normalized email and verifies argon2. It uses a dummy hash for absent users to reduce timing disclosure.
5. Auth.js writes the JWT session cookie. `requireAdmin()` protects every writing panel Server Action and the panel layout enforces the rendered route.

`AUTH_SECRET` must contain at least 32 characters. Production deployments also need `AUTH_TRUST_HOST=true` behind Dokploy's proxy.

## Main files

| Responsibility       | File                                        |
| -------------------- | ------------------------------------------- |
| Optimistic redirect  | `src/proxy.ts`                              |
| Auth configuration   | `src/lib/auth.config.ts`, `src/lib/auth.ts` |
| Login UI and action  | `src/app/admin/login/`                      |
| Panel authorization  | `src/lib/admin/guard.ts`                    |
| Seeded administrator | `prisma/seed.ts`                            |

## Constraints

There is no public registration or password recovery flow. The Spanish public route and `volverA` query key are compatibility values, despite the English internal implementation.
