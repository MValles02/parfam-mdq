/**
 * Initial seed: an administrator user when environment credentials exist, plus
 * the SiteSetting singleton with production brand values.
 *
 *   pnpm db:seed
 *
 * It is safe to run again. The user is created only when that email does not
 * exist, and SiteSetting uses an empty upsert update so it preserves admin
 * changes from the panel.
 */
import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { prisma } from "@/lib/db";
import { SITE_SETTINGS_ID, siteDefaults } from "@/lib/site";

const ADMIN_DISPLAY_NAME = "Admin";

async function seedAdminUser() {
  // `authorize()` in src/lib/auth.ts searches lowercase email addresses. This
  // prevents uppercase ADMIN_SEED_EMAIL input from creating an unreachable user.
  const email = process.env.ADMIN_SEED_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!email || !password) {
    console.log(
      "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD are not set; skipping admin user.",
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user already exists (${email}); leaving it unchanged.`);
    return;
  }

  const passwordHash = await hash(password);
  await prisma.user.create({
    data: { email, passwordHash, name: ADMIN_DISPLAY_NAME, role: "ADMIN" },
  });
  console.log(`Created admin user: ${email}`);
}

async function seedSiteSettings() {
  await prisma.siteSetting.upsert({
    where: { id: SITE_SETTINGS_ID },
    create: {
      id: SITE_SETTINGS_ID,
      whatsappNumber: siteDefaults.whatsapp,
      whatsappMessageTemplate: siteDefaults.whatsappMessageTemplate,
      instagramHandle: siteDefaults.instagram,
      shippingInfo: siteDefaults.shippingInfo,
      seoDefaultTitle: siteDefaults.seoTitle,
      seoDefaultDescription: siteDefaults.description,
    },
    update: {},
  });
  console.log("SiteSetting is ready.");
}

async function main() {
  await seedAdminUser();
  await seedSiteSettings();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
