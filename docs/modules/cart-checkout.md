# Module: cart and checkout

## Responsibility

Persist a browser cart, reconcile it with PostgreSQL, create immutable orders, and construct a WhatsApp checkout link.

## Files

| File                                     | Responsibility                                      |
| ---------------------------------------- | --------------------------------------------------- |
| src/lib/cart.ts                          | Zustand cart, hydration helper, display totals      |
| src/lib/store/server-cart.ts             | Database reconciliation shared by both actions      |
| src/lib/store/use-cart-reconciliation.ts | Browser reconciliation hook                         |
| src/app/(store)/carrito/actions.ts       | Cart validation action                              |
| src/app/(store)/checkout/actions.ts      | Order creation                                      |
| src/lib/store/order-message.ts           | Template expansion                                  |
| src/lib/validations/checkout.ts          | Cart line limits, customer fields, and phone prefix |
| src/lib/whatsapp.ts                      | wa.me links, order number format, link storage key  |

## Rules

The cart persists under `parfam-cart`; old browser carts were discarded. The
client sends only variant IDs and quantities for reconciliation. Both actions
share one cart line schema in `src/lib/validations/checkout.ts` (1 to 99
units, at most 50 lines; checkout also requires one line) and reload variants
with `resolveCartLines`: `validateCartItems` serializes its Decimal prices for
the browser, while checkout keeps the Prisma Decimal database prices and then
creates OrderItem snapshots inside a transaction. Request and result fields
are English; customer messages remain Spanish.

The checkout page (`checkout-form.tsx`) renders the cart lines with `CartItemRow` (not `CartItemList`, which would run the reconciliation a second time) next to the customer form and order summary.
