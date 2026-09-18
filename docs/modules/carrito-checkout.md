# Módulo · Carrito y checkout

## Responsabilidad

Llevar al visitante desde "agregar al carrito" hasta un `Order` persistido y un
link de WhatsApp con el pedido escrito. Es el único módulo público que
**escribe** en la base.

Tres invariantes:

1. El carrito de `localStorage` es un **snapshot de presentación**, nunca la
   fuente de verdad.
2. El precio sale **siempre** de la base, nunca del cliente.
3. El pedido guarda **snapshot**: un cambio de precio futuro no lo toca.

## Entry points

| Superficie                           | Archivo                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| Drawer del carrito                   | `src/components/tienda/carrito-drawer.tsx` (el `<Sheet>` vive en `header.tsx`) |
| `/carrito`                           | `src/app/(tienda)/carrito/page.tsx`                                            |
| `/checkout`                          | `src/app/(tienda)/checkout/page.tsx`                                           |
| `/pedido/[number]/gracias`           | `src/app/(tienda)/pedido/[number]/gracias/page.tsx`                            |
| Server Action `validarCarritoAction` | `src/app/(tienda)/carrito/actions.ts`                                          |
| Server Action `crearPedido`          | `src/app/(tienda)/checkout/actions.ts`                                         |

## Archivos principales

| Archivo                                                                     | Rol                                                                              |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/lib/carrito.ts`                                                        | `"use client"` — store zustand + `persist`, `useHidratado`, `useCantidadCarrito` |
| `src/lib/tienda/carrito-servidor.ts`                                        | `revalidarItemsCarrito()` — la verdad sobre qué se puede comprar                 |
| `src/lib/tienda/usar-reconciliacion-carrito.ts`                             | `"use client"` — hook compartido por `/carrito` y `/checkout`                    |
| `src/lib/tienda/mensaje-pedido.ts`                                          | Expande la plantilla de WhatsApp                                                 |
| `src/lib/validations/checkout.ts`                                           | `checkoutSchema` (servidor), `checkoutClienteSchema` (cliente), `telefono`       |
| `src/components/tienda/carrito/{lista-items,item-fila,resumen-carrito}.tsx` | Compartidos entre drawer y `/carrito`                                            |
| `src/components/tienda/producto/comprar.tsx`                                | Donde empieza todo                                                               |
| `src/components/tienda/badge-carrito.tsx`                                   | Contador del header                                                              |

## API pública interna

```ts
// src/lib/carrito.ts
useCarrito()            // items, agregar, quitar, actualizarCantidad,
                        // actualizarPrecio, vaciar
useHidratado(): boolean
useCantidadCarrito(): number

// src/lib/tienda/carrito-servidor.ts
revalidarItemsCarrito(items) → ItemRevalidado[]
type RazonInvalido = "inactiva" | "eliminada" | "despublicado"

// src/lib/tienda/usar-reconciliacion-carrito.ts
useReconciliacionCarrito() → { cambios, descartarCambios, verificando }

// src/lib/tienda/mensaje-pedido.ts
armarMensajePedido({ plantilla, marca, nombre, numero, items, totalArs })

// src/app/(tienda)/checkout/actions.ts
crearPedido({ nombre, telefono, items, empresa }) → ResultadoCheckout
```

## Dependencias

`zustand` · `zod` · `libphonenumber-js` · `react-hook-form` · `sonner` ·
`lib/db` · `lib/catalogo` (`etiquetaVariante`, `precioArs`) ·
`lib/configuracion` · `lib/rate-limit` · `lib/whatsapp` · `next/headers`.

## Entidades

`ProductVariant`, `Product`, `Brand` (lectura) · `Order`, `OrderItem`
(escritura) · `SiteSetting` (lectura, para la plantilla y el número).

## Persistencia

| Operación                              | Cuándo                                                 |
| -------------------------------------- | ------------------------------------------------------ |
| `SELECT nextval('"Order_number_seq"')` | Dentro de la transacción de `crearPedido`              |
| `INSERT Order` + `INSERT OrderItem[]`  | Ídem, en la misma transacción                          |
| `findMany ProductVariant`              | En `revalidarItemsCarrito` y de nuevo en `crearPedido` |

---

## El store

```ts
type ItemCarrito = {
  variantId;
  productSlug;
  productName;
  brandName;
  variantLabel;
  unitPriceArs: string; // string: nunca float
  imagen: string | null;
  qty: number;
};
```

Clave `parfam-carrito`, versión 1, **sin función `migrate`**: si la forma de
`ItemCarrito` cambiara, los carritos viejos se rehidratarían incompletos.
`CANTIDAD_MAXIMA = 99`, aplicada en `agregar` y `actualizarCantidad`.

`actualizarPrecio` existe **sólo** para la reconciliación: es el único camino
por el que un precio se pisa sin que el usuario haga nada.

### `useHidratado`

`localStorage` no existe en el servidor. Este hook devuelve `false` en el
servidor **y en la hidratación** (React usa `getServerSnapshot` también ahí) y
`true` desde el render siguiente. Se implementa con `useSyncExternalStore` y no
con `useEffect` porque `react-hooks/set-state-in-effect` de React 19 marca eso
como **error**.

Es lo que evita que el badge del carrito rompa la hidratación en silencio.

---

## Reconciliación

```ts
useEffect(() => {
  if (!hidratado || items.length === 0) return;
  validarCarritoAction(
    items.map(({ variantId, qty }) => ({ variantId, qty })),
  ).then((resultado) => {
    /* … */
  });
}, [hidratado]); // ← sólo `hidratado`, a propósito
```

| Caso                                      | Tratamiento                                                                                                           |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `eliminada` / `inactiva` / `despublicado` | Se saca solo, con toast. No hay nada que confirmar                                                                    |
| Precio distinto                           | Se actualiza **y** se junta en `cambios`; la pantalla lo muestra y pide confirmación explícita antes de dejar avanzar |

Si dependiera de `items`, cada `+1`/`-1` del stepper repetiría el viaje a la base.

`revalidarItemsCarrito` resuelve **todos** los items con una sola consulta y
clasifica en orden: no existe → no activa → producto no publicado → `ok`.

Detalle del ciclo completo: [`data-flow.md`](../data-flow.md#3-reconciliación-el-punto-donde-el-cliente-y-la-base-se-vuelven-a-mirar).

---

## `crearPedido`

Orden exacto de las diez etapas:

| #   | Etapa                         | Detalle                                                                                                                                                       |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Honeypot                      | `empresa` no vacío → `"No pudimos procesar el pedido. Probá de nuevo."` — el **mismo** mensaje genérico que cualquier otro error, para no darle pistas al bot |
| 2   | Rate limit                    | `checkout:<ip>`, 5 / 10 min. IP de `x-forwarded-for` → `x-real-ip` → `"desconocida"`                                                                          |
| 3   | `checkoutSchema`              | `nombre` 2-120 · `telefono` → E.164 con `libphonenumber-js` región AR · `items` 1-50                                                                          |
| 4   | `findMany` de variantes       | Una sola consulta, con producto y marca                                                                                                                       |
| 5   | Clasificación                 | Cada item: `eliminada` / `inactiva` / `despublicado` / válido                                                                                                 |
| 6   | Corte si hay inválidos        | Mensaje distinto si son todos o algunos; devuelve `invalidos` para que el cliente los saque del carrito                                                       |
| 7   | `obtenerConfiguracionSitio()` | Plantilla y número de WhatsApp                                                                                                                                |
| 8   | Transacción                   | `nextval` → `PM-%04d` → total con `Prisma.Decimal` → `Order` + `OrderItem[]`                                                                                  |
| 9   | `armarMensajePedido`          | Con los subtotales ya calculados en `Decimal`                                                                                                                 |
| 10  | Respuesta                     | `{ ok: true, numero, link }`                                                                                                                                  |

El paso 6 **no debería ocurrir** en el uso normal: la reconciliación ya lo
evitó. Es el borde real — sin JS, con una pestaña vieja, o llamando la acción
directo (`checkout/actions.ts:156-158`).

### El honeypot

Campo `empresa`, fuera de react-hook-form y fuera de `checkoutSchema` a
propósito: si tuviera validación normal, un error de zod en un campo que el
usuario nunca ve sería una pista rara en el `formState`. Se lee con un `useRef`
al enviar. En el DOM va posicionado fuera de pantalla (`absolute -left-[9999px]`)
y **no** con `hidden`, porque algunos bots saltean lo oculto a propósito.

---

## El popup de WhatsApp

```ts
function alEnviarClick() {
  const popup = window.open("", "_blank");   // ← SINCRÓNICO con el click
  void handleSubmit(async (valores) => {
    const resultado = await crearPedido({...});
    if (!resultado.ok) { popup?.close(); /* … */ return; }
    if (popup) popup.location.href = resultado.link;
    router.push(`/pedido/${resultado.numero}/gracias?link=…`);
  }, () => popup?.close())();
}
```

Si el `window.open` ocurriera después del `await`, Safari y Chrome en modo
estricto lo bloquearían. Arranca en blanco y recibe destino cuando vuelve la
acción; si el formulario es inválido o la acción falla, se cierra.

En `/gracias` **no** se reintenta un `window.open` automático: ahí no hay gesto
del usuario, así que se bloquearía seguro. Lo que corresponde es un botón
visible para el reintento manual (`_gracias-cliente.tsx:43-46`).

---

## `/pedido/[number]/gracias`

`PM-0043` es trivialmente el siguiente de `PM-0042`. La decisión: esta página
**nunca consulta la base** por `number`. Todo sale del `link` que le pasa
`/checkout` por query string. Sin `link`, cae al mismo mensaje genérico para
cualquier número, exista o no el pedido.

El carrito se vacía **acá** y no en `/checkout`: si no, un F5 en el checkout
mandaría el mismo pedido dos veces.

> El `link` llega sin validar al `href` → [`findings.md#f-05`](../findings.md#f-05).

---

## Flujos relacionados

- [`flows/agregar-al-carrito.md`](../flows/agregar-al-carrito.md)
- [`flows/crear-pedido.md`](../flows/crear-pedido.md)
- [`flows/gestionar-pedido.md`](../flows/gestionar-pedido.md) — lo que pasa después
