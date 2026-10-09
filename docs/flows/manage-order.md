# Flow: manage an order

## Purpose

Give the administrator a concise operational view of persisted orders and allow
status and internal-note updates without changing the historical order snapshot.

## Entry points

The preserved public panel routes are `/admin/pedidos` and
`/admin/pedidos/[id]`. URL status values remain the existing route contract;
internal filtering uses `OrderStatusFilter`.

## Flow

1. The panel page calls `listOrders` and renders `OrdersTable` with status
   counts and a search query.
2. The detail page calls `getOrderById`, displays the immutable item snapshot,
   and derives a WhatsApp contact link from the stored E.164 phone number.
3. `StatusSelector` calls `changeOrderStatus`; `OrderNotes` calls
   `saveOrderNotes`.
4. Each Server Action starts with `requireAdmin()`, confirms that the order
   exists, updates only the intended field, and revalidates the list and detail
   routes.

## Data model

`Order.status` uses `PENDING`, `CONFIRMED`, `DELIVERED`, or
`CANCELLED`. Spanish labels are UI copy. `adminNotes` is internal operator
text. Product, variant, label, unit price, and quantity stay frozen in
`OrderItem`; this flow must never recalculate them from the current catalog.

## Main files

| Responsibility         | File                                                                         |
| ---------------------- | ---------------------------------------------------------------------------- |
| Queries and DTOs       | `src/lib/admin/orders.ts`                                                    |
| Mutating actions       | `src/app/admin/(panel)/pedidos/actions.ts`                                   |
| List and detail routes | `src/app/admin/(panel)/pedidos/`                                             |
| List controls          | `_components/orders-list.tsx`, `status-selector.tsx`                         |
| Detail controls        | `_components/order-detail.tsx`, `src/components/admin/order-status-chip.tsx` |

## Constraints

Order management does not take payments, update inventory, edit snapshot items,
or send WhatsApp messages. It only creates a chat link for the administrator.

## Related documentation

- [Admin orders module](../modules/admin-orders.md)
- [Create order flow](create-order.md)
