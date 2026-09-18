import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { obtenerEstadisticasPanel } from "@/lib/admin/panel";

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
  const stats = await obtenerEstadisticasPanel();

  return (
    <>
      <PageHeader
        title="Panel"
        description="Todo lo que se ve en la tienda se administra desde acá."
      />

      <div className="grid gap-4 p-8 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="PRODUCTOS PUBLICADOS"
          value={stats.publicados}
          hint={`${stats.borradores} en borrador`}
          href="/admin/productos"
        />
        <Stat
          label="PEDIDOS PENDIENTES"
          value={stats.pedidosPendientes}
          hint="Esperando confirmación"
          href="/admin/pedidos"
        />
        <Stat
          label="NOTAS SIN TRADUCIR"
          value={stats.notasSinTraducir}
          hint="Se muestran en inglés"
          href="/admin/notas"
        />
        <Stat
          label="CATÁLOGO DE REFERENCIA"
          value={stats.referencias}
          hint="Fragancias para buscar"
          href="/admin/productos"
        />
      </div>
    </>
  );
}
