import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/admin/orders";
import { OrderDetail } from "../_components/order-detail";

export async function generateMetadata(
  props: PageProps<"/admin/pedidos/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const order = await getOrderById(id);
  return { title: order ? order.number : "Pedido" };
}

export default async function Page(props: PageProps<"/admin/pedidos/[id]">) {
  const { id } = await props.params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <>
      <h1 className="sr-only">Pedido {order.number}</h1>
      <p className="px-6 pt-4 text-xs text-muted-foreground">
        <Link href="/admin/pedidos" className="hover:text-foreground">
          Pedidos
        </Link>
      </p>
      <OrderDetail order={order} />
    </>
  );
}
