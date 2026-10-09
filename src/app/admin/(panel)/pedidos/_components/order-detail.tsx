import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { OrderStatusChip } from "@/components/admin/order-status-chip";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getNextOrderStatus, ORDER_STEPS } from "@/lib/admin/order-status";
import { ORDER_STATUS_LABELS, type getOrderById } from "@/lib/admin/orders";
import { formatArsPrice } from "@/lib/catalog";
import { formatRelativeDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { CopyPhoneButton } from "./copy-phone-button";
import { NextStatusActions } from "./next-status-actions";
import { OrderNotes } from "./order-notes";
import { StatusSelector } from "./status-selector";

type Order = NonNullable<Awaited<ReturnType<typeof getOrderById>>>;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </span>
  );
}

/** Full detail of one order, shared by the split view and `/admin/pedidos/[id]`. */
export function OrderDetail({ order }: { order: Order }) {
  const stepIndex = ORDER_STEPS.findIndex((step) => step === order.status);
  const isCancelled = order.status === "CANCELLED";

  return (
    <article className="flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b px-6 py-6">
        <div>
          <p className="text-xs text-muted-foreground">
            {formatRelativeDate(order.createdAt)}
          </p>
          <div className="mt-1.5 flex items-center gap-3">
            <h2 className="text-3xl leading-none font-extrabold tracking-tight">
              {order.number}
            </h2>
            <OrderStatusChip status={order.status} />
          </div>
        </div>
        <StatusSelector
          id={order.id}
          status={order.status}
          labels={ORDER_STATUS_LABELS}
        />
      </div>

      <div className="flex flex-col gap-6 p-6">
        {isCancelled ? (
          <p
            role="status"
            className="rounded bg-danger px-3 py-2.5 text-sm text-danger-foreground"
          >
            Este pedido está cancelado.
          </p>
        ) : (
          <ol className="flex items-center gap-2 text-xs font-semibold">
            {ORDER_STEPS.map((step, index) => (
              <li
                key={step}
                aria-current={index === stepIndex ? "step" : undefined}
                className={cn(
                  "flex-1 rounded px-2 py-1.5 text-center",
                  index <= stepIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                {ORDER_STATUS_LABELS[step]}
              </li>
            ))}
          </ol>
        )}

        <NextStatusActions
          id={order.id}
          status={order.status}
          nextStatus={getNextOrderStatus(order.status)}
          labels={ORDER_STATUS_LABELS}
        />

        <div className="rounded border bg-card p-5">
          <SectionLabel>Cliente</SectionLabel>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-foreground">
                {order.customerName}
              </p>
              <p className="text-sm text-muted-foreground">
                {order.customerPhone}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <CopyPhoneButton phone={order.customerPhone} />
              <Button
                asChild
                className="bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
              >
                <a
                  href={order.whatsappChatLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle />
                  Abrir chat
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded border bg-card">
          <div className="border-b px-5 py-3">
            <SectionLabel>Items</SectionLabel>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Cant.</TableHead>
                <TableHead>Precio al pedir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-normal">
                    {item.productId ? (
                      <Link
                        href={`/admin/productos/${item.productId}`}
                        className="text-sm font-semibold hover:underline"
                      >
                        {item.productName}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold">
                        {item.productName}
                      </span>
                    )}
                    <span className="block text-xs text-muted-foreground">
                      {item.variantLabel} · {formatArsPrice(item.unitPriceArs)}
                    </span>
                  </TableCell>
                  <TableCell>{item.qty}</TableCell>
                  <TableCell className="font-semibold">
                    {formatArsPrice(item.subtotalArs)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t bg-muted/40 px-5 py-3">
            <SectionLabel>Total</SectionLabel>
            <p className="text-base font-extrabold text-foreground">
              {formatArsPrice(order.totalArs)}
            </p>
          </div>
        </div>

        <div className="rounded border bg-card p-5">
          <SectionLabel>Notas del admin · solo las ve el panel</SectionLabel>
          <div className="mt-2.5">
            <OrderNotes id={order.id} initialNotes={order.adminNotes} />
          </div>
        </div>
      </div>
    </article>
  );
}
