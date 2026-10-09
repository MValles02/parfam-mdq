import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
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
import { getDashboardStats } from "@/lib/admin/dashboard";
import { serializeOrderListParams } from "@/lib/admin/order-list-params";
import { ORDER_STATUS_LABELS } from "@/lib/admin/orders";
import { auth } from "@/lib/auth";
import { formatArsPrice } from "@/lib/catalog";
import { formatRelativeDate } from "@/lib/date";

export const metadata: Metadata = { title: "Panel" };

function Card({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number;
  hint?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded border bg-card p-5 transition-colors hover:border-foreground/30"
    >
      <span className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-4xl font-extrabold tracking-tight">
        {value.toLocaleString("es-AR")}
      </span>
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </Link>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {subtitle ? (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "full",
  timeZone: "America/Argentina/Buenos_Aires",
});

export default async function AdminHomePage() {
  const [stats, session] = await Promise.all([getDashboardStats(), auth()]);
  const firstName = session?.user?.name?.trim().split(/\s+/)[0] ?? "Admin";

  return (
    <>
      <PageHeader
        title={`Hola, ${firstName}`}
        description={dateFormatter.format(new Date())}
        action={
          <Button asChild>
            <Link href="/admin/productos/nuevo">+ Nuevo producto</Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-8 p-4 sm:p-8">
        <section aria-label="Para resolver" className="flex flex-col gap-3">
          <SectionTitle title="Para resolver" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card
              label="Pedidos pendientes"
              value={stats.pendingOrders}
              hint={
                stats.oldestPendingAt
                  ? `El más viejo: ${formatRelativeDate(stats.oldestPendingAt)}`
                  : "Nada esperando confirmación"
              }
              href={serializeOrderListParams("/admin/pedidos", {
                estado: "pendientes",
              })}
            />
            <Card
              label="Borradores"
              value={stats.draftProducts}
              href="/admin/productos?estado=borradores"
            />
            <Card
              label="Publicados sin foto"
              value={stats.publishedWithoutImages}
              href="/admin/productos"
            />
            <Card
              label="Publicados sin presentaciones activas"
              value={stats.publishedWithoutActiveVariants}
              href="/admin/productos"
            />
          </div>
        </section>

        <section
          aria-label="Pedidos de los últimos 7 días"
          className="flex flex-col gap-3"
        >
          <SectionTitle
            title="Pedidos de los últimos 7 días"
            subtitle="Según el estado actual de cada pedido."
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card
              label="Pedidos recibidos"
              value={stats.last7Days.total}
              href="/admin/pedidos"
            />
            {(["PENDING", "CONFIRMED", "DELIVERED"] as const).map((status) => (
              <Card
                key={status}
                label={`${ORDER_STATUS_LABELS[status]}s ahora`}
                value={stats.last7Days.byStatus[status] ?? 0}
                href="/admin/pedidos"
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Total de confirmados y entregados (estado actual):{" "}
            <span className="font-semibold text-foreground">
              {formatArsPrice(stats.last7Days.confirmedAndDeliveredArs)}
            </span>
          </p>
        </section>

        <section aria-label="Pedidos recientes" className="flex flex-col gap-3">
          <SectionTitle
            title="Pedidos recientes"
            subtitle="Los últimos 5, con su estado actual."
          />
          {stats.recentOrders.length === 0 ? (
            <p className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
              Todavía no entró ningún pedido.
            </p>
          ) : (
            <div className="overflow-hidden rounded border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link
                          href={serializeOrderListParams("/admin/pedidos", {
                            pedido: order.id,
                          })}
                          className="font-semibold hover:underline"
                        >
                          {order.number}
                        </Link>
                      </TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell className="max-w-56 truncate text-muted-foreground">
                        {order.itemNames.join(", ")}
                      </TableCell>
                      <TableCell>
                        <OrderStatusChip status={order.status} />
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatArsPrice(order.totalArs)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRelativeDate(order.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
