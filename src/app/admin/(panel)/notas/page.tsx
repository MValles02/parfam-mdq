import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Notas sin traducir" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Notas sin traducir"
        description="Completá la traducción al español de las notas que faltan."
      />
      <div className="p-8">
        <div className="rounded border border-dashed p-12 text-center text-sm text-muted-foreground">
          Se construye en la Fase 3 (ver PLAN.md).
        </div>
      </div>
    </>
  );
}
