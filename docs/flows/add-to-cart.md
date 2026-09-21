# Flow: add to cart

## Purpose

Let a visitor select an active product variant and quantity, persist that selection in the browser, and reconcile it with the database before checkout.

## Entry point

`/producto/[slug]` renders `Purchase` from `src/components/store/product/purchase.tsx`. Only `PUBLISHED` products with an `isActive` variant expose the cart controls. Customer copy, including the WhatsApp fallback for unavailable variants, remains in Spanish.

## Flow

1. The server query supplies a display snapshot with `unitPriceArs` as a string. Prisma `Decimal` values never enter a Client Component.
2. `useCart` adds or increments a `CartItem`; quantity is limited to 99.
3. Zustand persists version 2 to the established `parfam-carrito` key. The migration maps the previous persisted `imagen` field to internal `image`.
4. `CartItemList` calls `useCartReconciliation` after hydration. The action sends only `{ variantId, qty }`; it never trusts a browser price or name.
5. `validateCartItems` reloads variants and product publication state. It returns current display data or an invalid-item reason. The client removes invalid lines and refreshes changed prices.

`useCartReconciliation` depends on hydration rather than `items`, so changing a stepper does not repeat the database request.

## Main files

| Responsibility             | File                                                     |
| -------------------------- | -------------------------------------------------------- |
| Browser cart and migration | `src/lib/cart.ts`                                        |
| Cart server validation     | `src/lib/store/server-cart.ts`                           |
| Cart action boundary       | `src/app/(store)/carrito/actions.ts`                     |
| Reconciliation hook        | `src/lib/store/use-cart-reconciliation.ts`               |
| Drawer and badge           | `src/components/store/cart-drawer.tsx`, `cart-badge.tsx` |
| Shared cart UI             | `src/components/store/cart/`                             |
| Cart page                  | `src/app/(store)/carrito/`                               |

## Persistence and contracts

The cart exists only in `localStorage`; it does not create database rows. `parfam-carrito` and the v1 Spanish `imagen` field are compatibility data and must remain supported. The Spanish raw response fields returned at the action boundary are external compatibility fields; internal server-cart types use English names.

## Related documentation

- [Cart and checkout module](../modules/cart-checkout.md)
- [Create order flow](create-order.md)
- [Data flow](../data-flow.md)
