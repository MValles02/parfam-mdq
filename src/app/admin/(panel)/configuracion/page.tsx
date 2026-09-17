import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { obtenerConfiguracionEditable } from "@/lib/admin/configuracion";
import { FormularioConfiguracion } from "./_components/formulario-configuracion";

export const metadata: Metadata = { title: "Configuración" };

export default async function Page() {
  const configuracion = await obtenerConfiguracionEditable();

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Número de WhatsApp, textos de la marca y redes."
      />
      <div className="max-w-2xl p-8">
        <FormularioConfiguracion configuracion={configuracion} />
      </div>
    </>
  );
}
