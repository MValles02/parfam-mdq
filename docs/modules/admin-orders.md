# Module: administration orders

## Responsibility

Provide panel queries and controlled updates for persisted WhatsApp checkout orders. It is an internal operator module; the customer never sees order status.

## API

- listOrders({ query, status }) returns table rows and status counts.
- getOrderById(id) returns detail and an operator WhatsApp chat link.
- changeOrderStatus(id, status) and saveOrderNotes(id, notes) are protected Server Actions.

## Files

| File                                       | Responsibility                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| src/lib/admin/orders.ts                    | Prisma queries, DTOs, and `ORDER_STATUS_LABELS` (Spanish labels)        |
| src/lib/admin/order-status.ts              | Prisma-free `ORDER_STEPS` and `getNextOrderStatus`                      |
| src/app/admin/(panel)/pedidos/actions.ts   | Authorized mutations and revalidation                                   |
| src/app/admin/(panel)/pedidos/             | List and detail routes (`page.tsx` maps `estado` URL values to filters) |
| _components/orders-list.tsx                | Selectable order rows (split view)                                      |
| _components/order-detail.tsx               | Detail pane, next-status and copy-phone                                 |
| src/components/admin/order-status-chip.tsx | Status chip (warning, secondary, success, danger tokens)                |

## Constraints

Every action begins with requireAdmin(). Existing routes and Spanish UI status labels remain unchanged. OrderItem is immutable historical data: this module never recalculates current product names or prices.

## Dashboard queries

`getDashboardStats` in `src/lib/admin/dashboard.ts` feeds `/admin`: pending count and oldest pending date, drafts, published products without images or without active variants, and the last 7 days of orders (count, `groupBy` status, `Prisma.Decimal` sum of CONFIRMED and DELIVERED totals returned as a string). There is no status history, so all figures use each order's current status. Recent orders (5) link to `/admin/pedidos?pedido=<id>`.
