import { prisma } from "@/lib/db";

export type EditableSettings = {
  whatsappNumber: string;
  whatsappMessageTemplate: string;
  instagramHandle: string;
  shippingInfo: string;
  seoDefaultTitle: string;
  seoDefaultDescription: string;
};

/**
 * Uncached read used to prefill `/admin/configuracion`.
 *
 * Unlike the cached public `getSiteSettings()`, this needs raw values. An
 * optional field left empty in the database must stay empty in the form, so a
 * public fallback is never saved as administrator-authored text. The seeded
 * singleton row always exists, so this does not need the public missing-row
 * fallback.
 */
export async function getEditableSettings(): Promise<EditableSettings> {
  const settings = await prisma.siteSetting.findUniqueOrThrow({
    where: { id: "singleton" },
  });

  return {
    whatsappNumber: settings.whatsappNumber,
    whatsappMessageTemplate: settings.whatsappMessageTemplate,
    instagramHandle: settings.instagramHandle ?? "",
    shippingInfo: settings.shippingInfo ?? "",
    seoDefaultTitle: settings.seoDefaultTitle ?? "",
    seoDefaultDescription: settings.seoDefaultDescription ?? "",
  };
}
