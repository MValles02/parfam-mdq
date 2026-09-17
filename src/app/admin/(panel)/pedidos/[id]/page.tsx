import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { precioArs } from "@/lib/catalogo";
import { hace } from "@/lib/fecha";
import { ESTADO_PEDIDO, pedidoPorId } from "@/lib/admin/pedidos";
import { ChipEstadoPedido } from "../_components/chip-estado-pedido";
import { SelectorEstado } from "../_components/selector-estado";
import { NotasPedido } from "../_components/notas-pedido";

export async function generateMetadata(
  props: PageProps<"/admin/pedidos/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const pedido = await pedidoPorId(id);
  return { title: pedido ? pedido.number : "Pedido" };
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </span>
  );
}

export default async function Page(props: PageProps<"/admin/pedidos/[id]">) {
  const { id } = await props.params;
  const pedido = await pedidoPorId(id);
  if (!pedido) notFound();

  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b px-8 py-7">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/admin/pedidos" className="hover:text-foreground">
              Pedidos
            </Link>
            {` · ${hace(pedido.createdAt)}`}
          </p>
          <div className="mt-1.5 flex items-center gap-3">
            <h1 className="text-3xl leading-none font-extrabold tracking-tight">
              {pedido.number}
            </h1>
            <ChipEstadoPedido status={pedido.status} />
          </div>
        </div>
        <SelectorEstado
          id={pedido.id}
          status={pedido.status}
          etiquetas={ESTADO_PEDIDO}
        />
      </div>

      <div className="flex flex-col gap-6 p-8">
        <div className="rounded border bg-card p-5">
          <Etiqueta>Cliente</Etiqueta>
          <div className="mt-2 flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-foreground">
                {pedido.customerName}
              </p>
              <p className="text-sm text-muted-foreground">
                {pedido.customerPhone}
              </p>
            </div>
            <Button
              asChild
              className="bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
            >
              <a
                href={pedido.linkChat}
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
            <Etiqueta>Items</Etiqueta>
          </div>
          <div className="divide-y">
            {pedido.items.map((item) => (
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
                    {item.variantLabel} · {precioArs(item.unitPriceArs)} ×{" "}
                    {item.qty}
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {precioArs(item.subtotal)}
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t bg-muted/40 px-5 py-3">
            <Etiqueta>Total</Etiqueta>
            <p className="text-base font-extrabold text-foreground">
              {precioArs(pedido.totalArs)}
            </p>
          </div>
        </div>

        <div className="rounded border bg-card p-5">
          <Etiqueta>Notas del admin</Etiqueta>
          <div className="mt-2.5">
            <NotasPedido id={pedido.id} notasIniciales={pedido.adminNotes} />
          </div>
        </div>
      </div>
    </>
  );
}
