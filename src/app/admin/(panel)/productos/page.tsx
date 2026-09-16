import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Productos" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Productos"
        description="Alta, edición y publicación del catálogo."
      />
      <div className="p-8">
        <div className="rounded border border-dashed p-12 text-center text-sm text-muted-foreground">
          Se construye en la Fase 3 (ver PLAN.md).
        </div>
      </div>
    </>
  );
}
