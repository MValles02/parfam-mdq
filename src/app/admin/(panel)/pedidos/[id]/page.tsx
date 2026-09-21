import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatArsPrice } from "@/lib/catalog";
import { formatRelativeDate } from "@/lib/date";
import { ORDER_STATUS_LABELS, getOrderById } from "@/lib/admin/orders";
import { OrderStatusChip } from "../_components/order-status-chip";
import { StatusSelector } from "../_components/status-selector";
import { OrderNotes } from "../_components/order-notes";

export async function generateMetadata(
  props: PageProps<"/admin/pedidos/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const order = await getOrderById(id);
  return { title: order ? order.number : "Pedido" };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </span>
  );
}

export default async function Page(props: PageProps<"/admin/pedidos/[id]">) {
  const { id } = await props.params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b px-8 py-7">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/admin/pedidos" className="hover:text-foreground">
              Pedidos
            </Link>
            {` · ${formatRelativeDate(order.createdAt)}`}
          </p>
          <div className="mt-1.5 flex items-center gap-3">
            <h1 className="text-3xl leading-none font-extrabold tracking-tight">
              {order.number}
            </h1>
            <OrderStatusChip status={order.status} />
          </div>
        </div>
        <StatusSelector
          id={order.id}
          status={order.status}
          labels={ORDER_STATUS_LABELS}
        />
      </div>

      <div className="flex flex-col gap-6 p-8">
        <div className="rounded border bg-card p-5">
          <SectionLabel>Cliente</SectionLabel>
          <div className="mt-2 flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-foreground">
                {order.customerName}
              </p>
              <p className="text-sm text-muted-foreground">
                {order.customerPhone}
              </p>
            </div>
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

        <div className="overflow-hidden rounded border bg-card">
          <div className="border-b px-5 py-3">
            <SectionLabel>Items</SectionLabel>
          </div>
          <div className="divide-y">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div>
                  {item.productId ? (
                    <Link
                      href={`/admin/productos/${item.productId}`}
                      className="text-sm font-semibold text-foreground hover:underline"
                    >
                      {item.productName}
                    </Link>
                  ) : (
                    <p className="text-sm font-semibold text-foreground">
                      {item.productName}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {item.variantLabel} · {formatArsPrice(item.unitPriceArs)} ×{" "}
                    {item.qty}
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {formatArsPrice(item.subtotalArs)}
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t bg-muted/40 px-5 py-3">
            <SectionLabel>Total</SectionLabel>
            <p className="text-base font-extrabold text-foreground">
              {formatArsPrice(order.totalArs)}
            </p>
          </div>
        </div>

        <div className="rounded border bg-card p-5">
          <SectionLabel>Notas del admin</SectionLabel>
          <div className="mt-2.5">
            <OrderNotes id={order.id} initialNotes={order.adminNotes} />
          </div>
        </div>
      </div>
    </>
  );
}
