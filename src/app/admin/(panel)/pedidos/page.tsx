import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Pedidos" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Los pedidos que entran por WhatsApp, con su estado."
      />
      <div className="p-8">
        <div className="rounded border border-dashed p-12 text-center text-sm text-muted-foreground">
          Se construye en la Fase 5 (ver PLAN.md).
        </div>
      </div>
    </>
  );
}
