"use server";

import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import { actionFailure, type ActionResult } from "@/lib/admin/action-result";
import { SITE_SETTINGS_TAG } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { SITE_SETTINGS_ID } from "@/lib/site";
import { fieldErrors } from "@/lib/validations/errors";
import { settingsSchema } from "@/lib/validations/settings";

/**
 * Every action in this file starts with `requireAdmin()`. A Server Action is
 * a public POST endpoint, so the `/admin` layout does not protect it.
 */

/**
 * `SiteSetting` always has the seeded `singleton` row, so this is always an
 * update rather than a create.
 */
export async function saveSettings(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure(
      "Revisá los campos marcados.",
      fieldErrors(parsed.error),
    );
  }
  const settings = parsed.data;

  await prisma.siteSetting.update({
    where: { id: SITE_SETTINGS_ID },
    data: {
      whatsappNumber: settings.whatsappNumber,
      whatsappMessageTemplate: settings.whatsappMessageTemplate,
      instagramHandle: settings.instagramHandle,
      shippingInfo: settings.shippingInfo,
      seoDefaultTitle: settings.seoDefaultTitle,
      seoDefaultDescription: settings.seoDefaultDescription,
    },
  });

  // `{ expire: 0 }` provides read-your-own-writes behavior. The next checkout
  // and the rest of the store must see the new value immediately.
  revalidateTag(SITE_SETTINGS_TAG, { expire: 0 });

  return { ok: true };
}
