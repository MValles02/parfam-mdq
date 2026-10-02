# Routes

The route group name `(store)` does not appear in public URLs.

## Store routes

| URL                                             | Source                                     | Notes                                            |
| ----------------------------------------------- | ------------------------------------------ | ------------------------------------------------ |
| `/`                                             | `src/app/(store)/page.tsx`                 | Store home: full filtered, paginated catalog.    |
| `/producto/[slug]`                              | `(store)/producto/[slug]/page.tsx`         | Returns 404 for missing or draft products.       |
| `/carrito`                                      | `(store)/carrito/page.tsx`                 | Persisted cart.                                  |
| `/checkout`                                     | `(store)/checkout/page.tsx`                | WhatsApp order checkout.                         |
| `/pedido/[number]/gracias`                      | `(store)/pedido/[number]/gracias/page.tsx` | Customer thank-you view without an order lookup. |
| `/como-comprar`, `/presentaciones`, `/contacto` | matching store pages                       | Customer information.                            |

## Admin routes

| URL                                                                   | Source                         | Access                                              |
| --------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------- |
| `/admin/login`                                                        | `src/app/admin/login/page.tsx` | Public login; signed-in users redirect to `/admin`. |
| `/admin`                                                              | `admin/(panel)/page.tsx`       | Administrator only.                                 |
| `/admin/productos`, `/admin/productos/nuevo`, `/admin/productos/[id]` | product pages                  | Administrator only.                                 |
| `/admin/pedidos`, `/admin/pedidos/[id]`                               | order pages                    | Administrator only.                                 |
| `/admin/marcas`, `/admin/configuracion`                               | supporting panel pages         | Administrator only.                                 |

The proxy and panel layout both protect the panel. Every action has its own
server authorization check; see [authentication.md](authentication.md).

## URL compatibility contracts

Catalog URLs retain these Spanish keys: `q`, `genero`, `presentacion`,
`marca`, `acorde`, `nota`, `precio`, `orden`, and `pagina`.
`src/lib/store/filters.ts` maps them to English `CatalogFilters` fields.

Admin list URLs retain `q`, `estado`, and `pagina` where applicable.
Login links now emit `returnTo`; the login page and action still accept
`volverA` from old bookmarks and open forms.

## Metadata routes

`src/app/robots.ts`, `src/app/sitemap.ts`, and `src/app/icon.tsx` provide
robots, sitemap, and icon routes. Store route segments export Open Graph images
because metadata image conventions do not inherit through nested routes.
