import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Configuración" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Configuración"
        description="Número de WhatsApp, textos de la marca y redes."
      />
      <div className="p-8">
        <div className="rounded border border-dashed p-12 text-center text-sm text-muted-foreground">
          Se construye en la Fase 6 (ver PLAN.md).
        </div>
      </div>
    </>
  );
}
