import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { getEditableSettings } from "@/lib/admin/settings";
import { SettingsForm } from "./_components/settings-form";

export const metadata: Metadata = { title: "Configuración" };

export default async function Page() {
  const settings = await getEditableSettings();

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Número de WhatsApp, textos de la marca y redes."
      />
      <div className="max-w-2xl p-8">
        <SettingsForm settings={settings} />
      </div>
    </>
  );
}
