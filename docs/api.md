# API

El sistema **no expone una API REST**. La superficie programática son
**23 Server Actions** (endpoints POST que genera Next y que el cliente invoca
como funciones) y **2 Route Handlers**.

> Una Server Action es un endpoint HTTP público. El layout de `/admin` **no** la
> protege: cualquiera que conozca su ID puede invocarla sin pasar por el proxy ni
> por el layout. Por eso toda acción del panel abre con `requireAdmin()`
> (`src/lib/admin/guard.ts`).

---

## Route Handlers

| Método       | Endpoint                  | Handler                                                                     | Auth                             | Servicio | Persistencia                       |
| ------------ | ------------------------- | --------------------------------------------------------------------------- | -------------------------------- | -------- | ---------------------------------- |
| `GET`        | `/api/health`             | `src/app/api/health/route.ts`                                               | ninguna                          | —        | `SELECT 1`                         |
| `GET`/`POST` | `/api/auth/[...nextauth]` | `src/app/api/auth/[...nextauth]/route.ts` → `handlers` de `src/lib/auth.ts` | pública (es el endpoint de auth) | Auth.js  | `User.findUnique` en `authorize()` |

### `GET /api/health`

- `export const dynamic = "force-dynamic"` — un health cacheado en el build
  sería el 200 fijo que se quiere evitar.
- `200 { estado: "ok", base: "ok" }` si el `SELECT 1` responde.
- `503 { estado: "error", base: "sin conexión" }` si falla; loguea `[health]`.
- Ambas con `Cache-Control: no-store`.
- **Consumidores**: el `HEALTHCHECK` del `Dockerfile` y el de Dokploy — es lo
  que dispara el rollback de un deploy fallido. Ver [`deployment.md`](deployment.md).

### `/api/auth/[...nextauth]`

Rutas estándar de Auth.js (`/signin`, `/signout`, `/session`, `/csrf`, `/callback/credentials`…).
El proyecto **no** las llama a mano: el login va por la Server Action `login()`,
que usa `signIn("credentials", { redirect: false })`, y el logout por
`cerrarSesion()` con `signOut()`. `robots.ts` bloquea `/api/`.

---

## Server Actions

### Públicas (sin autenticación)

| Acción                 | Archivo                        | Entrada                                | Valida                                   | Escribe                               | Devuelve                                                                 |
| ---------------------- | ------------------------------ | -------------------------------------- | ---------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| `validarCarritoAction` | `(tienda)/carrito/actions.ts`  | `{ variantId, qty }[]`                 | `z.array(...)`; si falla devuelve `[]`   | **nada**                              | `ItemRevalidado[]`                                                       |
| `crearPedido`          | `(tienda)/checkout/actions.ts` | `{ nombre, telefono, items, empresa }` | honeypot → rate limit → `checkoutSchema` | `Order` + `OrderItem[]` (transacción) | `{ ok, numero, link }` \| `{ ok: false, mensaje, errores?, invalidos? }` |

<a id="del-panel-19-de-20-abren-con-requireadmin"></a>

### Del panel (19 de 20 abren con `requireAdmin()`)

| Acción                    | Archivo                         | Entrada                                 | Valida                                            | Escribe                                                                                                       | Revalida                                                                          |
| ------------------------- | ------------------------------- | --------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `cerrarSesion`            | `admin/(panel)/actions.ts`      | —                                       | —                                                 | —                                                                                                             | `signOut({ redirectTo: "/admin/login" })`                                         |
| `buscarReferenciasAction` | `productos/actions.ts`          | `query: string`                         | `z.string().max(120).catch("")`                   | —                                                                                                             | —                                                                                 |
| `adoptarReferenciaAction` | `productos/actions.ts`          | `id: string`                            | —                                                 | —                                                                                                             | —                                                                                 |
| `buscarNotasAction`       | `productos/actions.ts`          | `query`                                 | trim                                              | —                                                                                                             | —                                                                                 |
| `crearNotaAction`         | `productos/actions.ts`          | `nombre`                                | `z.string().trim().min(2).max(80)`                | `Note` (upsert por slug)                                                                                      | —                                                                                 |
| `buscarPerfumistasAction` | `productos/actions.ts`          | `query`                                 | trim                                              | —                                                                                                             | —                                                                                 |
| `crearPerfumistaAction`   | `productos/actions.ts`          | `nombre`                                | `min(2).max(120)`                                 | `Perfumer` (upsert)                                                                                           | —                                                                                 |
| `buscarMarcasAction`      | `productos/actions.ts`          | `query`                                 | trim                                              | —                                                                                                             | —                                                                                 |
| `guardarProducto`         | `productos/actions.ts`          | `(id \| null, entrada)`                 | `productoSchema` + verificación de FK             | `Product` + `ProductNote`/`ProductAccord`/`ProductPerfumer`/`ProductVariant`/`ProductImage`, `Brand` (upsert) | `/admin/productos`, `/admin/productos/:id`, `revalidarTienda()`                   |
| `cambiarEstadoProducto`   | `productos/actions.ts`          | `(id, publicar: boolean)`               | precondiciones de publicación                     | `Product.status`                                                                                              | `/admin/productos` + `revalidarTienda()`                                          |
| `duplicarProducto`        | `productos/actions.ts`          | `id`                                    | —                                                 | `Product` nuevo en `DRAFT` con todas sus hijas                                                                | `/admin/productos`                                                                |
| `eliminarProducto`        | `productos/actions.ts`          | `id`                                    | —                                                 | `DELETE Product` (cascada; `OrderItem` → `SetNull`)                                                           | `/admin/productos` + `revalidarTienda()`                                          |
| `pedirUrlDeSubida`        | `productos/imagenes-actions.ts` | `{ nombre, contentType, tamanioBytes }` | lista blanca de MIME + ≤ 8 MB + `r2Configurado()` | — (firma un PUT en R2)                                                                                        | —                                                                                 |
| `borrarImagenSubida`      | `productos/imagenes-actions.ts` | `clave: string`                         | `esClaveDeProducto(clave)`                        | borra el objeto de R2                                                                                         | —                                                                                 |
| `cambiarEstadoPedido`     | `pedidos/actions.ts`            | `(id, estado: OrderStatus)`             | existencia del pedido                             | `Order.status`                                                                                                | `/admin/pedidos`, `/admin/pedidos/:id`                                            |
| `guardarNotasPedido`      | `pedidos/actions.ts`            | `(id, notas: string)`                   | existencia; `trim() \|\| null`                    | `Order.adminNotes`                                                                                            | ídem                                                                              |
| `actualizarMarca`         | `marcas/actions.ts`             | `(id, entrada)`                         | `marcaSchema` (sólo `name`)                       | `Brand.name`                                                                                                  | `/`, `/catalogo`, `/marca/:slug`, `/producto/:slug` por cada producto de la marca |
| `traducirNota`            | `notas/actions.ts`              | `(id, nameEs)`                          | `z.string().trim().min(2).max(80)`                | `Note.nameEs`                                                                                                 | `/admin/notas`                                                                    |
| `borrarTraduccion`        | `notas/actions.ts`              | `id`                                    | —                                                 | `Note.nameEs = null`                                                                                          | `/admin/notas`                                                                    |
| `guardarConfiguracion`    | `configuracion/actions.ts`      | `entrada`                               | `configuracionSchema`                             | `SiteSetting` (`id: "singleton"`)                                                                             | `revalidateTag("site-settings", { expire: 0 })`                                   |
| `login`                   | `admin/login/actions.ts`        | `(prevState, FormData)`                 | `z.object({ email, password })` + rate limit      | — (escribe la cookie)                                                                                         | `redirect(destino)`                                                               |

---

## Contratos de resultado

Cuatro archivos declaran su propio `Resultado<T>` con la misma forma. No hay un
tipo compartido — ver [`F-11`](findings.md#f-11).

```ts
// productos/actions.ts · imagenes-actions.ts · notas/actions.ts · pedidos/actions.ts
type Resultado<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { datos: T }))
  | { ok: false; mensaje: string; errores?: Record<string, string[]> };
```

`crearPedido` usa su propio `ResultadoCheckout`, que agrega `invalidos`:

```ts
type ResultadoCheckout =
  | { ok: true; numero: string; link: string }
  | {
      ok: false;
      mensaje: string;
      errores?: Record<string, string[]>;
      invalidos?: {
        variantId: string;
        razon: "inactiva" | "eliminada" | "despublicado";
      }[];
    };
```

Los errores de zod se aplanan a `{ "variants.0.priceArs": ["..."] }` por una
función `erroresPorCampo()` duplicada en cuatro archivos. El cliente los vuelca
con `setError(campo, ...)` de react-hook-form, así el mensaje cae al lado del
control que lo causó.

---

## Las tres acciones que importan

### `crearPedido` — el único endpoint que escribe un pedido

`src/app/(tienda)/checkout/actions.ts`

```mermaid
sequenceDiagram
    actor C as Cliente
    participant F as FormularioCheckout
    participant A as crearPedido
    participant DB as PostgreSQL

    C->>F: click "Enviar pedido por WhatsApp"
    F->>F: window.open("", "_blank")  ← sincrónico con el click
    F->>A: { nombre, telefono, items[], empresa }
    A->>A: 1. honeypot `empresa` no vacío → falla genérica
    A->>A: 2. rateLimit(`checkout:<ip>`, 5 / 10 min)
    A->>A: 3. checkoutSchema (nombre, teléfono AR → E.164, 1..50 items)
    A->>DB: 4. findMany ProductVariant WHERE id IN (...)
    A->>A: 5. descartar eliminada / inactiva / producto no PUBLISHED
    alt hay inválidos
        A-->>F: { ok:false, invalidos } → el cliente los saca del carrito
    else todo válido
        A->>DB: 6. BEGIN
        A->>DB: 7. SELECT nextval('"Order_number_seq"')
        A->>DB: 8. INSERT Order + OrderItem[] (snapshot)
        A->>DB: 9. COMMIT
        A->>A: 10. armarMensajePedido(plantilla de SiteSetting)
        A-->>F: { ok:true, numero:"PM-0042", link:"https://wa.me/…" }
        F->>F: popup.location.href = link ; router.push(/pedido/…/gracias)
    end
```

Lo que **no** se negocia (y se verificó en el código):

- El precio sale de `v.priceArs` leído en el paso 4, nunca de
  `item.precioMostrado`. El total se suma con `Prisma.Decimal`, no con `Number`
  (`:179-182`).
- Sólo se vende `isActive: true` de un producto `PUBLISHED` (`:139-142`).
- `OrderItem` congela `productName`, `variantLabel` y `unitPriceArs`.
- El número sale de una `SEQUENCE` de Postgres: atómica, sin lock explícito, y
  un rollback no recicla el número.

Errores posibles: honeypot lleno · rate limit (mensaje con minutos restantes) ·
zod por campo · `invalidos` (parcial o total) · cualquier excepción de Prisma
sube sin capturar → la Server Action devuelve error genérico al cliente.

### `guardarProducto` — la acción más grande del panel

`src/app/admin/(panel)/productos/actions.ts:355-435`

1. `requireAdmin()`
2. `productoSchema.safeParse` — incluye el `superRefine` con las reglas de
   publicación (ver [`modules/admin-productos.md`](modules/admin-productos.md))
3. **Verificación de FK en paralelo**: cuenta `Note`, `Accord`, `Perfumer` y
   `FragranceRef` por id. Los ids que manda el cliente son datos, no verdad; sin
   esto un `createMany` explotaría con un error de FK ilegible.
4. Transacción:
   - `resolverMarca()` — usa `brandId` si existe, si no hace `upsert` por slug
   - `slugLibre()` — agrega `-2`, `-3`… excluyendo el propio id al editar
   - `create` o `update` de `Product`
   - `sincronizarRelaciones()` — **borra y recrea** notas/acordes/perfumistas
     (tablas de unión puras, sin estado que perder)
   - `sincronizarVariantes()` — **diffea**, no borra y recrea: `OrderItem`
     apunta a `variantId` y un delete lo pondría en `null`
   - `sincronizarImagenes()` — diffea igual, por id
5. `revalidatePath` del panel + `revalidarTienda(slug, marcaSlug)`

> `sincronizarImagenes()` borra la fila de `ProductImage` pero **no** el objeto
> de R2 → [`F-06`](findings.md#f-06).

### `validarCarritoAction` — la única acción pública de lectura

`src/app/(tienda)/carrito/actions.ts`

Sin `requireAdmin`, sin rate limit y sin honeypot **a propósito**: la invoca
cualquier visitante desde el drawer, `/carrito` y `/checkout`, y no escribe
nada. Delega en `revalidarItemsCarrito()`
(`src/lib/tienda/carrito-servidor.ts`), que resuelve todos los items con **una
sola consulta** y clasifica cada uno como `ok` o
`eliminada` / `inactiva` / `despublicado`.

Devuelve `nombre del producto`, `marca`, `etiqueta de variante` y `precio` de
cualquier `variantId` que se le mande — información que también está en la ficha
pública. Ver [`F-14`](findings.md#f-14).

---

## Autorización por acción

| Grupo                  | Chequeo                                                               | Archivo                     |
| ---------------------- | --------------------------------------------------------------------- | --------------------------- |
| Panel (19 acciones)    | `await requireAdmin()` como primera línea                             | `src/lib/admin/guard.ts`    |
| `crearPedido`          | honeypot + rate limit por IP; sin sesión                              | `checkout/actions.ts:71-93` |
| `validarCarritoAction` | ninguno                                                               | `carrito/actions.ts`        |
| `login`                | rate limit por `login:<ip>:<email>`, 5 / 10 min; se resetea al entrar | `login/actions.ts:35-48`    |

**Verificado**: 19 de las 20 acciones bajo `src/app/admin/(panel)/` llaman a `requireAdmin()` (`grep -c "await requireAdmin()"` = 19).
`cerrarSesion()` no lo hace, pero `signOut()` sobre una sesión inexistente no es
una operación privilegiada.

Matriz completa en [`authentication.md`](authentication.md#matriz-de-permisos).
