# Hallazgos

Descubrimientos de la auditoría que **no** pertenecen a la documentación
funcional. Nada de esto se corrigió: es un registro.

Clasificación: **RISK** (puede romper producción o exponer datos) ·
**WARNING** (deuda real, confunde o degrada) · **INFO** (observación,
posiblemente deliberada).

Estado del repositorio auditado: rama `main`, commit `2e8ef56`, con `docs/`
sin versionar.

| #             | Nivel    | Tema                                                                   |
| ------------- | -------- | ---------------------------------------------------------------------- |
| [F-01](#f-01) | RESUELTO | ~~`PLAN.md` citado por código que ya no puede consultarlo~~            |
| [F-02](#f-02) | RESUELTO | ~~El `Dockerfile` copia `public/`, que ya no existe~~                  |
| [F-03](#f-03) | INFO     | `token.role` se escribe y nunca se lee                                 |
| [F-04](#f-04) | WARNING  | `revalidatePath("/sitemap.xml")` no invalida la caché real del sitemap |
| [F-05](#f-05) | WARNING  | `?link=` llega sin validar al `href` de `/pedido/:n/gracias`           |
| [F-06](#f-06) | WARNING  | Objetos huérfanos en R2 al quitar una foto o borrar un producto        |
| [F-07](#f-07) | INFO     | El rate limit es por proceso: asume una sola réplica                   |
| [F-08](#f-08) | WARNING  | El seed guarda el email tal cual; el login lo busca en minúsculas      |
| [F-09](#f-09) | WARNING  | Hay un archivo de tests y ningún test runner                           |
| [F-10](#f-10) | WARNING  | Traducir una nota no revalida la tienda                                |
| [F-11](#f-11) | INFO     | `Resultado<T>` y `erroresPorCampo()` duplicados en cuatro archivos     |
| [F-12](#f-12) | INFO     | Dos páginas del panel consultan Prisma directo                         |
| [F-13](#f-13) | INFO     | El catálogo se ordena y pagina en memoria                              |
| [F-14](#f-14) | INFO     | `validarCarritoAction` es pública y sin rate limit                     |
| [F-15](#f-15) | INFO     | Los totales de pantalla se suman con `Number`                          |
| [F-16](#f-16) | INFO     | La reconciliación puede dispararse dos veces                           |
| [F-17](#f-17) | WARNING  | Umami: configurada de punta a punta, nunca implementada                |
| [F-18](#f-18) | INFO     | `eliminarProducto` no verifica existencia                              |
| [F-19](#f-19) | INFO     | `precioMostrado` se exige, se valida y no se usa                       |
| [F-20](#f-20) | INFO     | El `TODO` de los rangos de precio sigue abierto                        |
| [F-21](#f-21) | INFO     | `Perfumer.name` con mayúsculas inconsistentes, corregido al mostrar    |
| [F-22](#f-22) | WARNING  | `isFeatured` se persiste y ordena, pero no hay control en la UI        |
| [F-23](#f-23) | INFO     | `ProductVariant.sku` no tiene campo en el formulario                   |
| [F-24](#f-24) | INFO     | Cuatro columnas del schema sin ningún lector ni escritor               |

---

<a id="f-01"></a>

## F-01 · RESUELTO — Documentación referenciada que ya no existe

> **Corregido.** `PLAN.md` se borró a propósito (estaba terminado) y todas las
> referencias que quedaban se limpiaron: 20 menciones a `PLAN.md`, 42 a
> "Fase N" y 7 a las "trampas" de un documento inexistente, en 43 archivos.
> `AGENTS.md` se reescribió de cero y ahora remite a `docs/`. Cada comentario
> quedó autoexplicativo, sin depender de un documento externo.
>
> **Excepción deliberada**: las dos migraciones aplicadas
> (`busqueda_difusa_referencias`, `numero_pedido_secuencia`) conservan su
> "(Fase N)". Son artefactos históricos y no se editan — ver
> [`persistence.md`](persistence.md#migraciones).
>
> **Queda pendiente**: 32 comentarios citan `design/*.dc.html`, borrado en el
> mismo commit. Es el mismo problema, sin resolver.

**Lo observado originalmente.** El commit `2e8ef56 clean repo` borró `PLAN.md`
(1.360 líneas), `README.md`, `design/*.dc.html`, `brand/` y `public/`, pero
`AGENTS.md` seguía diciendo _"El plan completo, fase por fase, está en
`PLAN.md` — leerlo antes de empezar cualquier tarea"_, y el vocabulario de
"Fase 1" a "Fase 8" quedaba sin referente en decenas de comentarios.

---

<a id="f-02"></a>

## F-02 · RESUELTO — El `Dockerfile` copia `public/`, que ya no existe

**Observado.** `Dockerfile:` stage `runner`:

```dockerfile
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
```

`public/` fue borrado por `2e8ef56` (contenía los cinco SVG del scaffold de
Next). `git ls-files` no lo lista y `ls public` falla. `next build` no crea esa
carpeta.

**Efecto esperado.** Un `COPY` de BuildKit cuyo origen no existe **falla el
build**. El workflow `deploy.yml` corre en cada push a `main` que toque algo que
no sea `.md` → el próximo deploy de código se cae en el stage `runner`, después
de haber pagado el `pnpm install` y el `next build`.

**Verificación pendiente.** No se ejecutó `docker build` durante esta auditoría
(no se corrieron comandos que modifiquen el entorno). El commit que borró
`public/` es el último de la rama, y el workflow ignora commits de sólo `.md`
— **[Inferido]** el pipeline todavía no corrió con el árbol en este estado.

**Notas.** `.dockerignore` no excluye `public`, así que no es eso. La app no
referencia ningún archivo de `public/`: el favicon es `src/app/icon.tsx` y las
fuentes viven en `src/assets/`.

---

<a id="f-03"></a>

## F-03 · INFO — `token.role` se escribe y nunca se lee

**Observado.** `src/lib/auth.config.ts:25-31` escribe `token.role = "ADMIN"` en
el callback `jwt`. El callback `session` inmediatamente debajo copia **sólo**
`token.id`. `grep -rn "\.role\|role:" src/ | grep -v generated` devuelve
exactamente **una** línea: esa asignación.

**Efecto.** Ninguno hoy. Es andamiaje para una autorización por rol que no
existe: `UserRole` tiene un único valor (`ADMIN`) y `requireAdmin()` sólo
comprueba que haya `session.user`.

**Riesgo latente.** Si alguien agrega un segundo rol asumiendo que
`session.user.role` funciona, no va a existir.

---

<a id="f-04"></a>

## F-04 · WARNING — `revalidatePath("/sitemap.xml")` no invalida el sitemap

**Observado.** `src/app/admin/(panel)/productos/actions.ts:45` llama a
`revalidatePath("/sitemap.xml")` tras guardar, publicar o borrar un producto.
Pero `src/app/sitemap.ts` es `force-dynamic` y su consulta vive en:

```ts
const urlsCacheadas = unstable_cache(urlsDelSitio, ["sitemap-urls"], {
  revalidate: 3600,
});
```

**sin `tags`**. `revalidatePath` invalida la caché de rutas; no toca una entrada
de `unstable_cache` que no declara tag.

**Efecto.** Un producto nuevo tarda **hasta una hora** en aparecer en
`/sitemap.xml`, pese a la llamada explícita. El comentario de `sitemap.ts:14-18`
acepta esa latencia de una hora como diseño, así que el impacto real es bajo —
pero la llamada a `revalidatePath` sugiere una inmediatez que no ocurre.

---

<a id="f-05"></a>

## F-05 · WARNING — `?link=` sin validar en `/pedido/[number]/gracias`

**Observado.**

```tsx
// page.tsx
const link = typeof sp.link === "string" ? sp.link : null;
// _gracias-cliente.tsx
const href = link ?? linkWhatsappA(whatsappNumber, "…");
<a href={href} target="_blank" rel="noopener noreferrer">
  Abrir WhatsApp
</a>;
```

El valor llega del query string y se usa como `href` sin comprobar esquema ni
host. Lo legítimo siempre es un `https://wa.me/...` generado por `crearPedido`.

**Efecto.** `/pedido/PM-0001/gracias?link=https://sitio-atacante/` renderiza una
página **del dominio real**, con la marca, un `<h1>` de "¡Pedido armado!" y un
botón verde grande que lleva a donde diga el parámetro. Es un vector de
phishing clásico por URL compartida. `rel="noopener noreferrer"` mitiga el
`window.opener`, no el destino.

**[No determinado]** si un esquema `javascript:` llegaría a ejecutarse: React 19
sanea algunos casos de URL en `href`, y no se probó en un navegador durante esta
auditoría. El vector `http(s)` hacia un host arbitrario sí es seguro.

**Nota de contexto.** La misma página está bien pensada en el otro eje: _nunca_
consulta la base por `number` justamente para que adivinar `PM-0043` no revele
nada (`_gracias-cliente.tsx:10-18`). El agujero está en el otro parámetro.

---

<a id="f-06"></a>

## F-06 · WARNING — Objetos huérfanos en R2

**Observado.** `borrarObjeto()` (`src/lib/r2.ts:116`) tiene exactamente dos
call-sites: `borrarImagenSubida` (`imagenes-actions.ts:104`) y
`scripts/seed-dev.ts:561`.

`borrarImagenSubida` cubre **sólo** el caso "el admin sube una foto y la
descarta antes de guardar el producto". Su propio comentario dice:

> _"si ya se guardó, borrarla del bucket queda a cargo del flujo de guardado del
> producto, no de esta acción"_

Y el flujo de guardado **no lo hace**: `sincronizarImagenes()`
(`productos/actions.ts:316-353`) borra las filas de `ProductImage` con
`deleteMany` y nunca toca R2. `eliminarProducto()` tampoco: borra el `Product` y
deja que la cascada limpie `ProductImage`, sin pasar por el bucket.

**Efecto.** Cada foto quitada de un producto guardado, y cada foto de un
producto borrado, queda pagando espacio en R2 para siempre. Sin proceso de
limpieza (no hay cron ni script de GC).

**Complicación real.** `duplicarProducto()` **comparte** los `storageKey` con el
original a propósito (`actions.ts:554-557`: _"borrar la copia no puede borrar el
archivo del otro producto"_). Cualquier borrado en cascada tendría que contar
referencias antes de tocar el objeto.

---

<a id="f-07"></a>

## F-07 · INFO — Rate limit en memoria

**Observado.** `src/lib/rate-limit.ts` usa un `LRUCache` del proceso. Su propio
comentario lo declara: _"Alcanza porque la app corre con una sola réplica; si
algún día se escala horizontalmente hay que moverlo a Redis"_.

**Efecto.** Con N réplicas, el límite efectivo es N × 5 intentos. Además, el
contador se pierde en cada deploy o reinicio. Es una decisión consciente para el
tamaño del proyecto, registrada acá porque acopla el código a una restricción de
infraestructura que no está expresada en ningún lado del despliegue.

**Relacionado.** La IP sale de `x-forwarded-for` / `x-real-ip` y cae a
`"desconocida"` si no hay ninguno — todo el tráfico sin esos headers comparte un
solo bucket.

---

<a id="f-08"></a>

## F-08 · WARNING — Desajuste de mayúsculas entre el seed y el login

**Observado.**

```ts
// prisma/seed.ts — guarda el email TAL CUAL viene del entorno
const email = process.env.ADMIN_SEED_EMAIL;
const existing = await prisma.user.findUnique({ where: { email } });
await prisma.user.create({
  data: { email, passwordHash, name: "Admin", role: "ADMIN" },
});

// src/lib/auth.ts:35-37 — lo busca normalizado
const user = await prisma.user.findUnique({
  where: { email: email.toLowerCase() },
});
```

**Efecto.** Si `ADMIN_SEED_EMAIL` tiene alguna mayúscula (`Admin@parfammdq.com`),
el usuario se crea con ese valor y `authorize()` nunca lo encuentra: el login
falla siempre con _"Email o contraseña incorrectos"_, sin ninguna pista de la
causa. Y como no hay otra vía para crear un usuario, el panel queda
inaccesible hasta corregirlo en la base a mano.

`User.email` es `@unique` sin índice funcional de minúsculas, así que la base
tampoco lo impide.

---

<a id="f-09"></a>

## F-09 · WARNING — Un archivo de tests, ningún runner

**Observado.** `scripts/lib/fragrantica-parse.test.ts` existe y usa
`node:assert/strict`. Su cabecera dice:

> _"No es parte de una suite de CI todavía (no hay test runner instalado para
> unit tests, sólo Playwright para e2e) — se corre a mano con:
> `pnpm exec tsx scripts/lib/fragrantica-parse.test.ts`"_

**Pero Playwright tampoco está instalado**: no aparece en `dependencies` ni en
`devDependencies` de `package.json`. Lo único que queda de esa intención son
`/playwright-report/` y `/test-results/` en `.gitignore`.

`package.json` no tiene script `test`. `deploy.yml` no corre tests, lint ni
typecheck: buildea y publica.

**Efecto.** Cobertura automatizada: cero. Un cambio en los parsers del
importador no tiene red, salvo que alguien se acuerde de correr el archivo a
mano. Y el comentario afirma un e2e que no existe.

**Verificado en esta auditoría**: `pnpm typecheck` y `pnpm lint` pasan limpios.

---

<a id="f-10"></a>

## F-10 · WARNING — Traducir una nota no revalida la tienda

**Observado.** `traducirNota` y `borrarTraduccion`
(`src/app/admin/(panel)/notas/actions.ts`) sólo llaman a
`revalidatePath("/admin/notas")`.

Pero `Note.nameEs` se muestra en público, con fallback a `nameEn`:

- La pirámide olfativa de cada ficha (`productoPorSlug` →
  `capitalizar(n.note.nameEs ?? n.note.nameEn)`)
- El filtro de notas del catálogo (`opcionesDeFiltro` → misma expresión)

**Efecto.** Traducir "sandalwood" → "sándalo" se ve en el panel al instante y en
la tienda **no**, hasta que algo más invalide esas rutas (guardar cualquier
producto, o un deploy). El mismo patrón aplicaría a `crearNotaAction`, aunque
ahí el efecto es menor porque la nota recién creada todavía no está en ningún
producto publicado.

**Contraste.** `actualizarMarca` sí hace el trabajo completo: revalida `/`,
`/catalogo`, `/marca/:slug` y la ficha de cada producto de esa marca.

---

<a id="f-11"></a>

## F-11 · INFO — `Resultado<T>` y `erroresPorCampo()` duplicados

**Observado.** El mismo tipo aparece, literalmente idéntico, en cuatro archivos:

- `src/app/admin/(panel)/productos/actions.ts:26-28`
- `src/app/admin/(panel)/productos/imagenes-actions.ts:14-16` (con el comentario
  _"Mismo contrato que `Resultado<T>` de `./actions.ts`"_)
- `src/app/admin/(panel)/notas/actions.ts:13-15`
- `src/app/admin/(panel)/pedidos/actions.ts:13-15` (sin `errores`)

`marcas/actions.ts` y `configuracion/actions.ts` declaran una variante sin
genérico. Y `erroresPorCampo()` —la función que aplana los issues de zod a
`{ "variants.0.priceArs": [...] }`— está copiada en **cuatro** archivos
(`checkout`, `productos`, `marcas`, `configuracion`), idéntica.

**Efecto.** Nada roto. Es el tipo de duplicación que se paga cuando el contrato
cambia: hay que acordarse de los seis lugares. El proyecto tiene `src/lib/` para
esto.

---

<a id="f-12"></a>

## F-12 · INFO — Dos páginas del panel consultan Prisma directo

**Observado.** El resto del panel lee a través de `src/lib/admin/*`. Dos
excepciones:

- `src/app/admin/(panel)/page.tsx` → `getStats()`, cinco `count()` locales
- `src/app/admin/(panel)/notas/page.tsx` → `findMany` + tres `count()`

**Efecto.** Ninguno funcional. Registrado por consistencia: si `/admin/notas`
crece (paginado más complejo, exportación), la consulta tendría que mudarse a
`src/lib/admin/notas.ts`, que hoy no existe.

**Nota.** En `notas/page.tsx:33-35` hay un comentario que vale conservar: el
filtro **tiene que** escribirse `nameEs: null` (y no una negación equivalente)
para que el índice parcial `Note_untranslated_idx` lo cubra.

---

<a id="f-13"></a>

## F-13 · INFO — El catálogo se ordena y pagina en memoria

**Observado.** `listarCatalogo()` (`src/lib/tienda/consultas.ts:229-275`) trae
**todas** las filas que matchean el filtro, las ordena en JS y recorta la página
en memoria.

El motivo está documentado (`:219-228`): ordenar por precio es ordenar por el
mínimo de las variantes activas, una agregación sobre otra tabla que Prisma no
expresa en `orderBy`. Con decenas de productos, una consulta gana a las dos o
tres que haría falta en SQL. _"Si algún día el catálogo pasa de unos cientos de
productos, esto se reescribe con SQL crudo."_

**Efecto.** Ninguno hoy. Es un límite conocido y explícito, con el umbral
escrito. Queda acá para que el umbral no se olvide.

---

<a id="f-14"></a>

## F-14 · INFO — `validarCarritoAction` es pública y sin límite

**Observado.** La acción no llama a `requireAdmin()` ni a `rateLimit()` — a
propósito: la usa cualquier visitante desde el drawer, `/carrito` y `/checkout`,
y no escribe nada (`carrito/actions.ts:9-14`).

Devuelve, para cualquier `variantId` que se le mande: nombre del producto, marca,
etiqueta de variante y precio actual.

**Efecto.** Todo eso ya es público en la ficha del producto, así que no hay fuga
de información nueva. Lo que sí permite es **enumerar** precios y estados de
variantes a velocidad de máquina, incluidas las inactivas (devuelve
`razon: "inactiva"`, lo que confirma que el id existe). Acepta arrays sin tope
de longitud declarado en el schema de la acción — cada elemento se valida, pero
la cantidad no — y arma un `IN (...)` con todos.

Se clasifica INFO y no WARNING porque el dato es público y la escritura está
protegida en `crearPedido`.

---

<a id="f-15"></a>

## F-15 · INFO — Totales de pantalla con `Number`

**Observado.** `AGENTS.md` pide `Decimal`, nunca `float`. Se cumple en la base,
en tránsito y en `crearPedido`. Las excepciones son de presentación:

```ts
// formulario-checkout.tsx:75-78
const total = items.reduce((acc, i) => acc + Number(i.unitPriceArs) * i.qty, 0);
// y precioArs((Number(item.unitPriceArs) * item.qty).toFixed(2))
```

También en `resumen-carrito.tsx` y en `precioDesde()` de `consultas.ts`
(que compara con `Number()` pero **devuelve el string original**).

**Efecto.** Con precios en pesos argentinos de hasta 8 dígitos enteros y dos
decimales, el error de punto flotante de `double` no alcanza a mover el redondeo
de `Intl.NumberFormat` con `maximumFractionDigits: 0`. El total que se guarda lo
calcula `Prisma.Decimal` en el servidor.

Registrado porque es una excepción a una regla explícita del proyecto y conviene
que sea deliberada, no accidental.

---

<a id="f-16"></a>

## F-16 · INFO — La reconciliación puede dispararse dos veces

**Observado.** `useReconciliacionCarrito()` se llama desde dos componentes:

- `src/components/tienda/carrito/lista-items.tsx` (lo montan el drawer **y**
  `/carrito`)
- `src/app/(tienda)/checkout/_components/formulario-checkout.tsx`

En `/carrito` con el drawer abierto, hay dos instancias montadas a la vez → dos
llamadas a `validarCarritoAction`, cada una con su propio `cambios`.

**Efecto.** Menor: una consulta extra y, en el caso de un precio cambiado,
potencialmente dos toasts. Radix desmonta el contenido del `Sheet` cuando está
cerrado, así que el caso requiere abrir el drawer estando en `/carrito`.

---

<a id="f-17"></a>

## F-17 · WARNING — Umami configurada de punta a punta, nunca implementada

**Observado.** `NEXT_PUBLIC_UMAMI_URL` y `NEXT_PUBLIC_UMAMI_WEBSITE_ID`:

- están en `.env.example` bajo `# ---- Analitica (Umami self-hosted) ----`
- se declaran y validan en `src/lib/env.ts` (server y client)
- se pasan como build args en `.github/workflows/deploy.yml`
- se declaran como `ARG` + `ENV` en el stage `builder` del `Dockerfile`

**Y ningún componente las usa.** `grep -rn "UMAMI" src/` devuelve las cuatro
líneas de `env.ts` y nada más. No hay `<script>` de analítica en ningún layout.

**Efecto.** Toda la plomería está hecha y no mide nada. Quien cargue esas
variables en Dokploy va a creer que tiene analítica. Además, los build args
quedan inlineados en el bundle del cliente sin consumidor.

---

<a id="f-18"></a>

## F-18 · INFO — `eliminarProducto` no verifica existencia

**Observado.** `cambiarEstadoProducto`, `duplicarProducto`,
`cambiarEstadoPedido` y `guardarNotasPedido` empiezan buscando la fila y
devuelven `fallo("Ese … ya no existe.")` si no está. `eliminarProducto`
(`productos/actions.ts:575-586`) va directo al `prisma.product.delete`.

**Efecto.** Borrar dos veces (doble click, pestaña vieja) lanza `P2025` de
Prisma en vez de devolver `{ ok: false, mensaje }`. El usuario ve el error
genérico de Server Action de Next, no el mensaje del producto.

---

<a id="f-19"></a>

## F-19 · INFO — `precioMostrado` se exige, se valida y no se usa

**Observado.** `itemCheckoutSchema` (`validations/checkout.ts:13-24`) declara
`precioMostrado: z.string().min(1)` como **obligatorio**, con el comentario:

> _"El precio que el cliente tenía mostrado en pantalla al armar el pedido.
> Sirve sólo para que el servidor detecte si cambió desde entonces"_

`FormularioCheckout` lo envía. **`crearPedido` nunca lo compara**: usa
`item.variantId` y `item.qty`, y el precio lo relee de la base.

**Efecto.** Campo obligatorio sin consumidor. La detección de cambio de precio
que el comentario describe sí existe, pero vive del lado del cliente en
`useReconciliacionCarrito` (que compara contra `validarCarritoAction`), no acá.

Consecuencia práctica: un cliente que invoque `crearPedido` sin ese campo recibe
un error de validación por un dato que el servidor ignora.

---

<a id="f-20"></a>

## F-20 · INFO — `TODO` abierto en los rangos de precio

**Observado.** `src/lib/tienda/filtros.ts`:

> `TODO: revisar los cortes contra los precios reales del catalogo; hoy estan
calibrados contra los del seed de desarrollo (scripts/seed-dev.ts).`

Los cortes (`hasta-50000`, `50000-100000`, `100000-200000`, `desde-200000`)
están calibrados contra `scripts/seed-dev.ts`, no contra el catálogo real.

**[No determinado]** si el catálogo real ya está cargado: requiere mirar la base
de producción, fuera del alcance de esta auditoría.

---

<a id="f-21"></a>

## F-21 · INFO — `Perfumer.name` inconsistente, corregido al mostrar

**Observado.** `src/lib/catalogo.ts:97-108` documenta que `Perfumer.name` quedó
con mayúsculas inconsistentes tras el import: _"718 de las 1.355 filas están
enteras en minúscula, según de cuál de los dos CSV vino el dato"_.

La solución es `nombrePropio()`, que normaliza **al mostrar** (`"françois
demachy"` → `"François Demachy"`, dejando partículas como `de`/`van`/`di` en
minúscula salvo que abran el nombre). Se arregla ahí y no en la base _"para no
pisar correcciones que el admin pueda hacer a mano"_.

El propio comentario anota la deuda: _"el importador tendría que normalizarlo
antes de la importación de producción"_.

**Efecto.** Correcto en la tienda. Pero `nombrePropio()` se aplica **sólo** en
`productoPorSlug()`. El panel (`referenciaParaAdoptar`,
`buscarPerfumistasAction`, `productoParaEditar`) muestra el `name` crudo, así
que el admin ve `"paul parquet"` donde el cliente ve `"Paul Parquet"`. Y
`buscarPerfumistasAction` ordena por `name` ascendente, lo que con mayúsculas
mezcladas da un orden no alfabético en Postgres.

---

<a id="f-22"></a>

## F-22 · WARNING — `isFeatured` se persiste y ordena, pero no se puede activar

**Observado.** `Product.isFeatured` está completamente cableado:

- en el schema (`@default(false)`),
- en `productoSchema` (`z.boolean().default(false)`),
- en `valoresIniciales()` del formulario y en `campos` de `guardarProducto`,
- en `SELECT_TARJETA` y como clave de orden en `listarCatalogo()`
  (_"Novedades: lo destacado por el admin arriba, después lo más nuevo"_),
- en el `orderBy` de las **dos** consultas de `relacionados()`,
- y `duplicarProducto` lo fuerza a `false` en la copia.

**Y no hay ningún control en la UI para cambiarlo.**
`grep -rn "isFeatured" src/ --include=*.tsx` devuelve **sólo** dos líneas en
`producto-form.tsx`, y las dos son valores iniciales
(`isFeatured: false` para un producto nuevo, `p.isFeatured` al editar). No hay
`Controller`, `register`, `Switch` ni `ToggleGroup` asociado. Tampoco hay una
acción de tabla que lo cambie.

**Efecto.** Todo producto guardado desde el panel queda con `isFeatured: false`
para siempre. El criterio de orden _"destacados primero"_ —que es el default del
catálogo y el de los relacionados— nunca se activa. La funcionalidad existe
entera menos el interruptor.

**Nota.** `scripts/seed-dev.ts` sí puede poner `isFeatured: true`, así que en un
entorno sembrado con el seed de desarrollo el orden **sí** se ve funcionando —
lo que hace más fácil no notar que falta el control.

---

<a id="f-23"></a>

## F-23 · INFO — `ProductVariant.sku` no tiene campo en el formulario

**Observado.** `sku` está en el schema, en `varianteSchema`
(`textoOpcional(64)`), se precarga en `valoresIniciales()`
(`producto-form.tsx:114`) y se persiste en `sincronizarVariantes()`. `EditorVariantes`
tiene `Controller` para `isActive`, `kind`, `sizeMl` y `priceArs` — **no para
`sku`**; la única mención es `sku: null` al agregar una variante nueva.

**Efecto.** El SKU sólo puede llegar a la base por fuera del panel. El comentario
de `duplicarProducto` (_"El SKU no se copia: es identificador único del
original"_) protege un campo que hoy nadie puede completar.

---

<a id="f-24"></a>

## F-24 · INFO — Columnas del schema sin lector ni escritor

**Observado.** `grep -rn "logoUrl\|heroImageUrl\|announcementBar" src/ scripts/ prisma/seed.ts` no
devuelve **nada**. Sumado a `Product.sortOrder`, que no aparece en ningún
`orderBy` de `Product` ni en los `campos` de `guardarProducto`:

| Columna                       | Estado                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `SiteSetting.logoUrl`         | Sin uso. El logotipo es tipografía, no un archivo                                                                   |
| `SiteSetting.heroImageUrl`    | Sin uso. El hero es tipográfico                                                                                     |
| `SiteSetting.announcementBar` | Sin uso. No existe barra de anuncios en el header                                                                   |
| `Product.sortOrder`           | Sin uso. El orden manual nunca se implementó; el catálogo ordena por `isFeatured` + `createdAt` (ver [F-22](#f-22)) |

Ninguna está en `ConfiguracionSitio`, `ConfiguracionEditable`,
`configuracionSchema` ni `productoSchema`.

**Efecto.** Ninguno funcional: son `NULL`/`0` permanentes. Registrado porque
quien lea el schema va a asumir que el sitio soporta logo configurable, imagen
de hero y barra de anuncios, y no los soporta.

---

## Fortalezas que vale la pena no romper

No son hallazgos, pero cualquier refactor debería preservarlas:

| Qué                                                                                              | Dónde                                                  |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| El precio **siempre** se relee de la base antes de escribir un pedido                            | `checkout/actions.ts:104-152`                          |
| `OrderItem` guarda snapshot y las FK son `SET NULL`: un pedido no se rompe nunca                 | `schema.prisma`, migración `init`                      |
| El número de pedido sale de una `SEQUENCE`, no de un `count()`                                   | migración `numero_pedido_secuencia`                    |
| Defensa temporal en el login (`DUMMY_HASH`) contra enumeración de emails                         | `src/lib/auth.ts:13-20`                                |
| Tres capas de protección, con la real pegada a los datos (`requireAdmin`)                        | `src/lib/admin/guard.ts`                               |
| `/pedido/:n/gracias` no consulta la base porque el número es adivinable                          | `_gracias-cliente.tsx:10-18`                           |
| La clave de R2 la genera el servidor; `esClaveDeProducto()` valida todo lo que llega del cliente | `src/lib/r2.ts`, `imagenes-actions.ts`                 |
| `connection()` desacopla el build de Postgres                                                    | `src/lib/configuracion.ts:85-105`                      |
| `sincronizarVariantes()` diffea en vez de borrar y recrear, para no romper `OrderItem`           | `productos/actions.ts:269-314`                         |
| `colorDeChip()` garantiza 4,5:1 WCAG AA sobre un color que es **dato**, no token                 | `src/lib/color.ts`                                     |
| El popup de WhatsApp se abre sincrónico con el click                                             | `formulario-checkout.tsx:81-90`                        |
| `useSyncExternalStore` en vez de `useEffect` para la hidratación (regla de React 19)             | `src/lib/carrito.ts:94-112`, `src/hooks/use-mobile.ts` |
