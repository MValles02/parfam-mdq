<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Parfam MDQ

Tienda de perfumes (frascos, testers y decants) con checkout por WhatsApp y panel
de administracion. El plan completo, fase por fase, esta en `PLAN.md` — leerlo antes
de empezar cualquier tarea.

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Tailwind v4 ·
shadcn/ui (preset `radix-nova`, iconos Lucide) · Prisma + PostgreSQL · Auth.js v5 ·
Cloudflare R2. Deploy en Dokploy via GitHub Actions + GHCR.

## Convenciones

- **Usar librerias existentes.** Antes de escribir un componente o utilidad, revisar si
  ya existe en shadcn/ui o en el ecosistema. La tabla de librerias elegidas esta en `PLAN.md`.
- **UI en espaniol** (es-AR, voseo). El codigo, los identificadores y los commits en ingles
  o castellano sin tildes, pero los textos de cara al usuario siempre en espaniol.
- **Precios en ARS** con `Decimal` de Prisma, nunca `float`.
- **Los pedidos guardan snapshot** de nombre, variante y precio: un cambio de precio no
  debe alterar un pedido ya hecho.
- **Server Actions revalidan precios contra la base.** Nunca confiar en el precio que
  manda el cliente.
- Estado de filtros del catalogo en la URL (`nuqs`), no en estado local.

## Datos

`data/fragrantica/` tiene los CSV de referencia (69.948 fragancias) — ver el README de esa
carpeta para el formato y las trampas del parseo. `data/dictionaries/` tiene las traducciones
al espaniol de notas y acordes, que el dataset no trae.

Las imagenes y descripciones de Fragrantica **no se muestran en publico**: son referencia
interna del panel. Las fotos son propias, en R2, y los textos se escriben en espaniol.

## Comandos

```bash
pnpm dev          # servidor de desarrollo
pnpm build        # build de produccion
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm format       # prettier --write
pnpm db:up        # Postgres local (docker compose, puerto 5433)
pnpm db:down
```
