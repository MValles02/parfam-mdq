# Module: cart and checkout

## Responsibility

Persist a browser cart, reconcile it with PostgreSQL, create immutable orders, and construct a WhatsApp checkout link.

## Files

| File                                     | Responsibility                    |
| ---------------------------------------- | --------------------------------- |
| src/lib/cart.ts                          | Zustand cart and hydration helper |
| src/lib/store/server-cart.ts             | Database reconciliation           |
| src/lib/store/use-cart-reconciliation.ts | Browser reconciliation hook       |
| src/app/(store)/carrito/actions.ts       | Cart validation action            |
| src/app/(store)/checkout/actions.ts      | Order creation                    |
| src/lib/store/order-message.ts           | Template expansion                |

## Rules

The cart persists under `parfam-cart`; old browser carts were discarded. The
client sends only variant IDs and quantities for reconciliation. Checkout
reloads variants and uses Prisma Decimal database prices, then creates
OrderItem snapshots inside a transaction. Request and result fields are English;
customer messages remain Spanish.

The checkout page (`checkout-form.tsx`) renders the cart lines with `CartItemRow` (not `CartItemList`, which would run the reconciliation a second time) next to the customer form and order summary.
