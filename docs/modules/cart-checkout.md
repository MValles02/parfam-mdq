# Module: cart and checkout

## Responsibility

Persist a browser cart, reconcile it with PostgreSQL, create immutable orders, and construct a WhatsApp checkout link.

## Files

| File                                     | Responsibility                               |
| ---------------------------------------- | -------------------------------------------- |
| src/lib/cart.ts                          | Zustand cart, hydration helper, v1 migration |
| src/lib/store/server-cart.ts             | Database reconciliation                      |
| src/lib/store/use-cart-reconciliation.ts | Browser reconciliation hook                  |
| src/app/(store)/carrito/actions.ts       | Compatibility action boundary                |
| src/app/(store)/checkout/actions.ts      | Order creation                               |
| src/lib/store/order-message.ts           | Template expansion                           |

## Rules

The persisted parfam-carrito key and its v1 Spanish imagen field are preserved. The client sends only variant IDs and quantities for reconciliation. Checkout reloads variants and uses Prisma Decimal database prices, then creates OrderItem snapshots inside a transaction. Spanish checkout fields and messages are external/customer content; internal cart state uses English names.
