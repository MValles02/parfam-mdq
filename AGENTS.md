<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Parfam MDQ

Tienda de perfumes (frascos, testers y decants) en Mar del Plata, con checkout
por WhatsApp y panel de administracion. **No cobra**: el checkout persiste el
pedido, le da un numero correlativo (`PM-0042`) y devuelve un link `wa.me` con
el detalle escrito. El pago y la entrega se arreglan por chat.

Aplicacion unica de Next.js (no es monorepo): un proceso sirve la tienda y el
panel, contra un Postgres y un bucket de Cloudflare R2.

## Documentacion

`docs/` es el mapa tecnico del sistema, escrito contra el codigo. Empezar por
[`docs/README.md`](docs/README.md), que tiene el indice y una tabla de
"donde toco para cambiar X".

| Necesito…                             | Leer                     |
| ------------------------------------- | ------------------------ |
| Entender capas, modulos y boundaries  | `docs/architecture.md`   |
| Encontrar una ruta o su archivo       | `docs/routes.md`         |
| Server Actions y endpoints            | `docs/api.md`            |
| Seguir un caso de uso end-to-end      | `docs/flows/`            |
| Entender un dominio a fondo           | `docs/modules/`          |
| Modelo de datos, indices, migraciones | `docs/persistence.md`    |
| Login, sesion, guards, permisos       | `docs/authentication.md` |
| Caches, revalidacion, estado          | `docs/data-flow.md`      |
| R2, WhatsApp, variables de entorno    | `docs/integrations.md`   |
| Docker, CI, migraciones en runtime    | `docs/deployment.md`     |
| Deuda conocida y riesgos abiertos     | `docs/findings.md`       |

Si algo de `docs/` contradice al codigo, **gana el codigo** — y corregir el
documento es parte del cambio.

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript ·
Tailwind v4 · shadcn/ui (preset `radix-nova`, iconos Lucide) ·
Prisma 7 + PostgreSQL · Auth.js v5 (JWT, provider Credentials + argon2) ·
`nuqs` (estado en la URL) · `zustand` (carrito) · `zod` (validacion) ·
`react-hook-form` · Cloudflare R2.
Deploy: Docker multi-stage → GHCR → Dokploy.

## Reglas que no se negocian

- **Precios en ARS con `Decimal` de Prisma, nunca `float`.** Viajan como
  `string` hacia el cliente (un `Decimal` no es serializable a un Client
  Component) y los calculos que se persisten usan `Prisma.Decimal`.
- **El precio sale siempre de la base.** Toda Server Action que escriba
  relee `ProductVariant.priceArs` y descarta el que mando el cliente.
- **Los pedidos guardan snapshot** de nombre, variante y precio en `OrderItem`.
  Un cambio de precio o el borrado de un producto no pueden alterar un pedido
  ya hecho: las FK son opcionales y van con `onDelete: SetNull`.
- **La tienda solo muestra productos `PUBLISHED` con variantes `isActive`.**
  Esto se filtra en la consulta, no en el componente: un borrador tiene que dar
  404 aunque se conozca el slug.
- **Toda Server Action del panel arranca con `requireAdmin()`.** Una Server
  Action es un endpoint POST publico: el layout de `/admin` protege lo que se
  renderiza, no los datos. `src/proxy.ts` es solo una redireccion optimista.
- **Nada del cliente se cree sin verificar**: ids de notas/acordes/perfumistas,
  claves de R2 (`esClaveDeProducto`), `variantId`, `contentType` de una subida.

## Convenciones

- **Usar librerias existentes.** Antes de escribir un componente o utilidad,
  revisar si ya existe en shadcn/ui o en el ecosistema. El stack de arriba y
  `docs/architecture.md` tienen lo que ya esta elegido.
- **UI en espaniol** (es-AR, voseo). El codigo, los identificadores y los
  commits en ingles o castellano sin tildes; los textos de cara al usuario
  siempre en espaniol y con tildes.
- **Comentarios autoexplicativos.** Un comentario tiene que entenderse solo:
  explicar el _por que_ de una decision, sin depender de un documento externo
  ni de vocabulario de proyecto. Si hace falta una referencia, que sea a un
  archivo que existe en el repo.
- **Estado de filtros en la URL** (`nuqs`), no en estado local: los parsers se
  definen una sola vez y los comparten el Server Component y los controles.
- **Consultas fuera de las rutas.** Las paginas orquestan; las consultas viven
  en `src/lib/tienda/` (publicas) y `src/lib/admin/` (panel). Ninguno de esos
  dos importa al otro: lo comun sube a `src/lib/`.
- **Un Client Component no puede importar un modulo que traiga Prisma.** Si
  necesita un dato o una etiqueta de ahi, se le pasa como prop.
- **Validacion con el mismo schema en las dos puntas** (`src/lib/validations/`):
  el cliente valida para dar feedback, el servidor porque es el unico borde real.

## Datos

`data/fragrantica/` tiene los CSV de referencia (69.948 fragancias) — ver el
README de esa carpeta para el formato y las trampas del parseo.
`data/dictionaries/` tiene las traducciones al espaniol de notas y acordes, que
el dataset no trae.

Las imagenes y descripciones de Fragrantica **no se muestran en publico**: son
referencia interna del panel. Las fotos son propias, en R2, y los textos los
escribe el admin en espaniol.

Las migraciones ya aplicadas son artefactos historicos: **no se editan**, ni
siquiera sus comentarios. Un cambio de esquema es una migracion nueva.

## Comandos

```bash
pnpm dev          # servidor de desarrollo
pnpm build        # build de produccion (prisma generate + next build)
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm format       # prettier --write
pnpm db:up        # Postgres local (docker compose, puerto 5433)
pnpm db:down
pnpm db:migrate   # prisma migrate dev
pnpm db:seed      # usuario admin + fila singleton de SiteSetting
pnpm db:seed-dev  # productos de ejemplo (necesita R2 configurado)
pnpm db:import-fragrantica   # catalogo de referencia (acepta --limit N)
```

## Antes de dar algo por terminado

`pnpm typecheck` y `pnpm lint` tienen que pasar limpios. No hay test runner
instalado: `scripts/lib/fragrantica-parse.test.ts` se corre a mano con
`pnpm exec tsx`. El CI no corre ninguno de los tres — buildea y publica.
