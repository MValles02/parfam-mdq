# Module: SEO and metadata

## Responsibility

Build public metadata, JSON-LD, generated Open Graph images, robots directives, and sitemap URLs for the store.

## Files

| File                                | Responsibility                           |
| ----------------------------------- | ---------------------------------------- |
| src/lib/seo.ts                      | Metadata, JSON-LD, canonical URL helpers |
| src/app/sitemap.ts                  | Dynamic sitemap                          |
| src/app/robots.ts                   | Robots output                            |
| src/app/(store)/opengraph-image.tsx | Store OG image                           |
| Route opengraph-image.tsx files     | Route-specific OG images                 |
| src/app/icon.tsx                    | Generated favicon                        |

## Rules

Canonical and sitemap URLs come from `NEXT_PUBLIC_SITE_URL` through `absoluteUrl`; product paths come from `getProductPath` in `src/lib/catalog.ts`. Metadata targeting customers stays in Spanish and follows es-AR content conventions. JSON-LD is serialized safely before insertion. Sitemap URLs expose only public store routes and must reflect published catalog data.
