/**
 * Seed inicial: usuario admin (si hay credenciales en el env) + fila
 * singleton de SiteSetting con los valores reales de la marca.
 *
 *   pnpm db:seed
 *
 * Es seguro re-ejecutarlo: el usuario sólo se crea si no existe uno con ese
 * email, y SiteSetting usa upsert con `update: {}` — si ya existe, no pisa
 * lo que el admin haya cambiado desde el panel.
 */
import { hash } from "@node-rs/argon2";
import { prisma } from "@/lib/db";
import { siteDefaults } from "@/lib/site";

const DEFAULT_WHATSAPP_TEMPLATE = `¡Hola! Quiero hacer este pedido en {{marca}}:

{{items}}

Total: {{total}}

Nombre: {{nombre}}
Pedido: {{numero}}`;

async function seedAdminUser() {
  // En minúsculas porque `authorize()` (src/lib/auth.ts) busca así: si
  // `ADMIN_SEED_EMAIL` trae alguna mayúscula, el usuario se crearía con un
  // email que el login nunca encuentra (ver F-08 en docs/findings.md).
  const email = process.env.ADMIN_SEED_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!email || !password) {
    console.log(
      "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD no están seteados: se omite el usuario admin.",
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Usuario admin ya existe (${email}), no se toca.`);
    return;
  }

  const passwordHash = await hash(password);
  await prisma.user.create({
    data: { email, passwordHash, name: "Admin", role: "ADMIN" },
  });
  console.log(`Usuario admin creado: ${email}`);
}

async function seedSiteSettings() {
  await prisma.siteSetting.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      whatsappNumber: siteDefaults.whatsapp,
      whatsappMessageTemplate: DEFAULT_WHATSAPP_TEMPLATE,
      brandName: siteDefaults.name,
      brandTagline: siteDefaults.tagline,
      instagramHandle: siteDefaults.instagram,
      shippingInfo: "Coordinamos envío en Mar del Plata o retiro a convenir.",
      seoDefaultTitle: `${siteDefaults.name} — ${siteDefaults.tagline}`,
      seoDefaultDescription: siteDefaults.description,
    },
    update: {},
  });
  console.log("SiteSetting listo.");
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
