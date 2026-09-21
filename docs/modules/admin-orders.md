# Module: administration orders

## Responsibility

Provide panel queries and controlled updates for persisted WhatsApp checkout orders. It is an internal operator module; the customer never sees order status.

## API

- listOrders({ query, status }) returns table rows and status counts.
- getOrderById(id) returns detail and an operator WhatsApp chat link.
- changeOrderStatus(id, status) and saveOrderNotes(id, notes) are protected Server Actions.

## Files

| File                                     | Responsibility                               |
| ---------------------------------------- | -------------------------------------------- |
| src/lib/admin/orders.ts                  | Prisma queries, DTOs, Spanish display labels |
| src/app/admin/(panel)/pedidos/actions.ts | Authorized mutations and revalidation        |
| src/app/admin/(panel)/pedidos/           | List and detail routes                       |
| _components/orders-table.tsx             | Table and filters                            |

## Constraints

Every action begins with requireAdmin(). Existing routes and Spanish UI status labels remain unchanged. OrderItem is immutable historical data: this module never recalculates current product names or prices.
