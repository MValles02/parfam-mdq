# Integraciones externas

Cinco sistemas de terceros. Ninguno recibe datos de pago (no hay pasarela), y
ninguno expone webhooks entrantes hacia esta app.

> **Secretos**: este documento nombra variables de entorno; **nunca** sus
> valores. Los valores reales viven en `.env` (gitignoreado) y en Dokploy.

| Proveedor                 | Para qué                      | Código                                    | Dirección                                           |
| ------------------------- | ----------------------------- | ----------------------------------------- | --------------------------------------------------- |
| **Cloudflare R2**         | Fotos de producto             | `src/lib/r2.ts`                           | Sale (presign + delete), y el browser sube directo  |
| **WhatsApp** (`wa.me`)    | Canal de venta                | `src/lib/whatsapp.ts`                     | Sale: sólo una URL                                  |
| **Instagram**             | Link del footer y `/contacto` | `src/lib/whatsapp.ts`                     | Sale: sólo una URL                                  |
| **Google Search Console** | Verificación de propiedad     | `src/app/layout.tsx`                      | Entra: Google lee el HTML                           |
| **Google Fonts**          | Fuente Outfit                 | `src/app/layout.tsx` (`next/font/google`) | Build-time                                          |
| **GHCR + Dokploy**        | Registro de imágenes y deploy | `.github/workflows/deploy.yml`            | Sale: push + webhook                                |
| **Umami**                 | Analítica self-hosted         | `src/app/(tienda)/layout.tsx`             | Sale: `<script>` al host de `NEXT_PUBLIC_UMAMI_URL` |

---

## Cloudflare R2

**Propósito**: guardar las fotos propias de producto. Las imágenes de
Fragrantica nunca se usan.

**Código**: `src/lib/r2.ts` · `src/app/admin/(panel)/productos/imagenes-actions.ts` ·
`src/app/admin/(panel)/productos/_components/panel-imagenes.tsx` ·
`src/components/tienda/foto-producto.tsx` · `scripts/seed-dev.ts`

**SDK**: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (R2 es
compatible con la API de S3). Endpoint
`https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`, región `"auto"`.

### Variables

| Variable               | Obligatoria | Uso                                                                               |
| ---------------------- | ----------- | --------------------------------------------------------------------------------- |
| `R2_ACCOUNT_ID`        | no*         | Endpoint                                                                          |
| `R2_ACCESS_KEY_ID`     | no*         | Credencial                                                                        |
| `R2_SECRET_ACCESS_KEY` | no*         | Credencial                                                                        |
| `R2_BUCKET`            | no*         | Bucket destino                                                                    |
| `R2_PUBLIC_URL`        | no*         | Host público. **También se lee en `next.config.ts` para `images.remotePatterns`** |

\* Opcionales en `src/lib/env.ts` a propósito: el módulo tiene que poder
importarse sin romper el build aunque las cinco estén vacías. `r2Configurado()`
devuelve `true` sólo si están las cinco; si falta alguna, el panel muestra un
mensaje ("Cloudflare R2 todavía no está configurado") y la tienda cae al
placeholder de frasco.

> `.env.example:20-22` advierte que el token debe estar acotado **sólo** al
> bucket de imágenes: no reusar el de los backups de la VPS.

### Operaciones

| Operación                          | Función                               | Quién la llama                               |
| ---------------------------------- | ------------------------------------- | -------------------------------------------- |
| `PutObject` **presignado** (5 min) | `urlDeSubida({ clave, contentType })` | `pedirUrlDeSubida`                           |
| `DeleteObject`                     | `borrarObjeto(clave)`                 | `borrarImagenSubida` y `scripts/seed-dev.ts` |
| Armar URL pública                  | `urlPublica(clave)`                   | la capa de consultas (tienda y panel)        |

### Datos que viajan

- **Sale hacia R2**: el archivo de imagen (directo del browser, **nunca pasa por
  el servidor**), su `Content-Type` y la clave generada por el servidor.
- **Vuelve**: nada más que el status HTTP del PUT.
- **Se persiste**: sólo `ProductImage.storageKey`.

### Las tres decisiones que importan

1. **Cliente perezoso** (`src/lib/r2.ts:51-64`): el `S3Client` se crea en la
   primera llamada real, no al importar el módulo.
2. **La clave la genera el servidor**:
   `productos/<año>/<mes>/<randomUUID()>.<ext>`. Usar el nombre de archivo del
   browser abriría path traversal y colisiones (`imagenes-actions.ts:72-78`).
3. **La base guarda la clave, no la URL** (migración
   `imagenes_guardan_clave`): cambiar de `pub-xxxx.r2.dev` a un dominio propio
   es cambiar `R2_PUBLIC_URL`, sin tocar ninguna fila.

### Limitaciones verificadas

- `next/image` sólo acepta el host de `R2_PUBLIC_URL`, y `remotePatterns` se
  evalúa **en `next build`** y queda serializado en el output standalone: **hay
  que rebuildear la imagen** para cambiar el host. No alcanza con tocar la
  variable en Dokploy (`next.config.ts:1-20`).
- Límite de subida: 8 MB, cuatro MIME (`jpeg`, `png`, `webp`, `avif`). La lista
  blanca está duplicada en el cliente (`panel-imagenes.tsx`) — a propósito:
  evita subidas que el usuario ve "progresar" y fallan al final.
- **No hay borrado de objetos al quitar una foto guardada ni al borrar un
  producto** → objetos huérfanos. Ver [`F-06`](findings.md#f-06).

Flujo completo: [`flows/subir-imagen.md`](flows/subir-imagen.md).

---

## WhatsApp

No hay API de WhatsApp: **la integración son links `wa.me`**. No hay token, ni
Business API, ni webhook.

`src/lib/whatsapp.ts`:

```ts
linkWhatsappA(numero, mensaje?)  // https://wa.me/<dígitos>?text=<encodeURIComponent(mensaje)>
telefonoVisible(e164)            // "+54 9 223 616 3910"
```

`wa.me` quiere el número en dígitos, sin `+` ni separadores.

### Dónde se usa

| Lugar                                | Mensaje                                          | Número                                |
| ------------------------------------ | ------------------------------------------------ | ------------------------------------- |
| `/checkout` → `crearPedido`          | El pedido completo, expandido desde la plantilla | `SiteSetting.whatsappNumber`          |
| `/pedido/:n/gracias`                 | El `link` recibido, o un fallback genérico       | ídem                                  |
| Ficha sin variantes activas          | `"¡Hola! Quería consultar por el X de Y."`       | ídem (prop desde el server)           |
| Footer, `/contacto`, `/como-comprar` | sin mensaje                                      | ídem                                  |
| `/admin/pedidos/:id` "Abrir chat"    | sin mensaje                                      | **`Order.customerPhone`** del cliente |

### La plantilla

`SiteSetting.whatsappMessageTemplate`, editable desde `/admin/configuracion`.
`src/lib/tienda/mensaje-pedido.ts` expande cinco placeholders:

| Placeholder  | Valor                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------- |
| `{{marca}}`  | `siteDefaults.name` (fijo, no `SiteSetting`)                                                  |
| `{{items}}`  | El único que expande a varias líneas: `• <marca> <producto> — <variante> x<qty> — <subtotal>` |
| `{{total}}`  | `Order.totalArs`, formateado en ARS                                                           |
| `{{nombre}}` | `Order.customerName`                                                                          |
| `{{numero}}` | `Order.number`                                                                                |

`armarMensajePedido()` recibe el subtotal **ya calculado** con `Decimal` en
`crearPedido`, para no repetir la multiplicación.

### Datos que salen

Nombre del cliente, número de pedido, líneas con marca/producto/variante/
cantidad/subtotal y el total. Viajan en la **URL** del link, así que quedan en
el historial del navegador y en el `Referer` — es inherente al mecanismo
`wa.me`, no una decisión de este código.

---

## Google

| Integración             | Dónde                      | Detalle                                                                                                                                                                                        |
| ----------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Search Console**      | `src/app/layout.tsx:32-37` | `verification.google` con un token. **No es un secreto**: se publica en el HTML de todas las páginas, que es justo cómo Google lo comprueba. Va en el root layout para cubrir también `/admin` |
| **Fonts**               | `src/app/layout.tsx:7-10`  | `next/font/google` con `Outfit`, subset latin, variable `--font-sans`. `next/font` la descarga y autoaloja en el build: **no hay request a Google en runtime**                                 |
| **Datos estructurados** | `src/lib/seo.ts`           | JSON-LD `Product`+`AggregateOffer`, `BreadcrumbList`, `Store`. Se sirven en el HTML; Google los lee al crawlear                                                                                |

`src/assets/fonts/Outfit-ExtraBold.ttf` es una **copia local** (licencia OFL
incluida) que se lee del disco en runtime para el favicon y las OG images — una
ruta que el trace de `@vercel/nft` no resuelve sola, por eso
`outputFileTracingIncludes` en `next.config.ts`.

---

## Umami

`NEXT_PUBLIC_UMAMI_URL` y `NEXT_PUBLIC_UMAMI_WEBSITE_ID`:

- declaradas y validadas como opcionales en `src/lib/env.ts`,
- documentadas en `.env.example`,
- pasadas como build args en `.github/workflows/deploy.yml` y en el `Dockerfile`,
- **leídas por `ScriptUmami()` en `src/app/(tienda)/layout.tsx`**: si las dos
  están seteadas, inyecta `<script src="{URL}/script.js" data-website-id="{ID}">`
  con `next/script` (`strategy="afterInteractive"`); si falta alguna, no
  renderiza nada.

Va en el layout de la tienda, no en el raíz: así sólo mide tráfico de
clientes, nunca el uso del panel de `/admin`. Sin las variables seteadas
(el caso de hoy en todos los entornos), la plomería queda igual de inerte
que antes — lo que cambió es que ahora sí hace algo en cuanto alguien cargue
una instancia real de Umami en Dokploy.

Ver [`F-17`](findings.md#f-17).

---

## GHCR y Dokploy

| Pieza                   | Detalle                                                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Registro**            | `ghcr.io/mvalles02/parfam-mdq`, tags `<sha>` y `latest`. GHCR exige el nombre en minúsculas                                                                                        |
| **Autenticación en CI** | `secrets.GHCR_TOKEN` (PAT clásico con `write:packages`). `secrets.GITHUB_TOKEN` **no sirve**: no deja crear un package nuevo en un namespace personal — documentado en el workflow |
| **Disparo del deploy**  | `curl -X POST "$DOKPLOY_WEBHOOK_URL"` al final del job. Si el secret no está cargado, el job publica la imagen y **no falla**                                                      |
| **Build args**          | `NEXT_PUBLIC_SITE_URL`, `R2_PUBLIC_URL`, `NEXT_PUBLIC_UMAMI_*` — son **variables** del repo, no secrets: Next las inlinea en el bundle y quedan a la vista en el HTML igual        |
| **Salud**               | Dokploy consulta `/api/health` (ver [`api.md`](api.md))                                                                                                                            |

Detalle completo en [`deployment.md`](deployment.md).

---

## Inventario de variables de entorno

De `.env.example` y `src/lib/env.ts`. **Ningún valor aparece acá.**

| Variable                                                                    | Validación en `env.ts`                                                 | Se necesita en                                     |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------- |
| `DATABASE_URL`                                                              | `z.url()` — **obligatoria**                                            | runtime + CLI de Prisma                            |
| `AUTH_SECRET`                                                               | `z.string().min(32)` — **obligatoria**                                 | runtime                                            |
| `AUTH_TRUST_HOST`                                                           | **no validada** — la lee Auth.js de `process.env`                      | producción y `next start` local detrás de un proxy |
| `NEXT_PUBLIC_SITE_URL`                                                      | `z.url()` — **obligatoria**                                            | **build** (inlineada) + runtime                    |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | opcionales                                                             | runtime                                            |
| `R2_PUBLIC_URL`                                                             | opcional en `env.ts`, **pero el `Dockerfile` la exige como build arg** | **build** + runtime                                |
| `NEXT_PUBLIC_UMAMI_URL` / `NEXT_PUBLIC_UMAMI_WEBSITE_ID`                    | opcionales                                                             | nada (ver arriba)                                  |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`                                  | opcionales                                                             | sólo `pnpm db:seed`                                |

`src/lib/env.ts` trata `""` como "no seteada": `.env` suele copiarse de
`.env.example` con las opcionales en blanco, y sin ese `preprocess` zod las
rechazaría por `.min(1)` / `.url()` / `.email()`.
