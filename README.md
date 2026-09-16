# Parfam MDQ

Tienda online y panel de administración para Parfam MDQ — perfumes originales, en frasco
entero y en decants, en Mar del Plata.

El checkout se completa por WhatsApp: el sitio arma el pedido y abre el chat con el mensaje
ya escrito.

## Estado

🚧 En construcción. El plan completo de implementación está en [`PLAN.md`](./PLAN.md).

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind + shadcn/ui · Prisma + PostgreSQL ·
Auth.js · Cloudflare R2 · Deploy en Dokploy vía GitHub Actions + GHCR.

## Antes de empezar a desarrollar

Faltan dos cosas que no están en el repo:

1. El .zip de FragDB en [`data/fragdb/`](./data/fragdb/README.md)
2. Las imágenes de marca en [`brand/`](./brand/README.md)
