# Flow: create an order through WhatsApp

## Purpose

Create an immutable `Order` snapshot, assign its sequential `PM-0042`-style number, and redirect the visitor to a prefilled WhatsApp chat. This is a checkout request, not a payment integration.

## Entry point

`/checkout` renders `CheckoutForm`. The Spanish button and validation text are
customer-facing content. The action receives `customerName`, `customerPhone`,
`items`, and the hidden `company` honeypot.

## Flow

1. The hydrated browser cart is reconciled before submission.
2. The click handler first validates the form client-side with `checkoutCustomerSchema` (same AR phone rule as the server, applied to the "+54 9"-prefixed value); if invalid it opens nothing and focuses the first invalid field. If valid it opens a blank popup synchronously, before any `await`, to avoid browser popup blocking.
3. `createOrder` checks the honeypot, applies `rateLimit`, validates the request, and reloads every `ProductVariant` from PostgreSQL.
4. The action rejects deleted, inactive, or unpublished items. Client prices are input only: persisted prices always use `ProductVariant.priceArs`.
5. A transaction obtains `Order_number_seq`, creates `Order` and `OrderItem` rows, and calculates totals with `Prisma.Decimal`.
6. `buildOrderMessage` expands the configured template and `buildWhatsAppLink` produces the `wa.me` URL. The action returns `orderNumber` and `link` on success, or `message`, `fieldErrors`, and `invalidItems` on failure.
7. Checkout stores the link in `sessionStorage` (`whatsapp-link:<number>`) and navigates to `/pedido/<number>/gracias` with no query string, so customer data never reaches the URL. The thank-you page clears the cart, reads the link (validated with `isValidWhatsAppLink`) and offers it as a manual WhatsApp button if the browser blocked the popup. After a reload in a new tab or on another device it shows a generic fallback link instead.

## Invariants

- Database prices are the only persisted price source.
- Only `PUBLISHED` products and `isActive` variants are purchasable.
- `OrderItem` stores product name, variant label, and price snapshots. Optional foreign keys use `onDelete: SetNull`, so later catalog edits do not change an existing order.
- Sequential numbers are generated inside the transaction and are not reused after rollbacks.

## Main files

| Responsibility       | File                                                     |
| -------------------- | -------------------------------------------------------- |
| Checkout form        | `src/app/(store)/checkout/_components/checkout-form.tsx` |
| Checkout action      | `src/app/(store)/checkout/actions.ts`                    |
| Validation           | `src/lib/validations/checkout.ts`                        |
| Settings lookup      | `src/lib/settings.ts`                                    |
| Message construction | `src/lib/store/order-message.ts`                         |
| WhatsApp URL helper  | `src/lib/whatsapp.ts`                                    |
| Thank-you page       | `src/app/(store)/pedido/[number]/gracias/`               |

## Preserved external values

The WhatsApp placeholders `{{marca}}`, `{{items}}`, `{{total}}`, `{{nombre}}`, and `{{numero}}` are stored template data. `+54 9`, `es-AR`, `ARS`, Spanish customer messages, and the public `/pedido/[number]/gracias` route remain unchanged.

## Related documentation

- [Cart and checkout module](../modules/cart-checkout.md)
- [Manage order flow](manage-order.md)
- [Persistence](../persistence.md)
