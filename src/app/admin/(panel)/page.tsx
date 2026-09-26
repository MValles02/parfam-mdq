import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { getDashboardStats } from "@/lib/admin/dashboard";

export const metadata: Metadata = { title: "Panel" };

function Stat({
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
      <span className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground">
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

export default async function AdminHomePage() {
  const stats = await getDashboardStats();

  return (
    <>
      <PageHeader
        title="Panel"
        description="Todo lo que se ve en la tienda se administra desde acá."
      />

      <div className="grid gap-4 p-8 sm:grid-cols-2 xl:grid-cols-3">
        <Stat
          label="PRODUCTOS PUBLICADOS"
          value={stats.publishedProducts}
          hint={`${stats.draftProducts} en borrador`}
          href="/admin/productos"
        />
        <Stat
          label="PEDIDOS PENDIENTES"
          value={stats.pendingOrders}
          hint="Esperando confirmación"
          href="/admin/pedidos"
        />
        <Stat
          label="CATÁLOGO DE REFERENCIA"
          value={stats.fragranceReferences}
          hint="Fragancias para buscar"
          href="/admin/productos"
        />
      </div>
    </>
  );
}
