# Hallazgos

Descubrimientos de la auditoría que **no** pertenecen a la documentación
funcional. Nada de esto se corrigió: es un registro.

Clasificación: **RISK** (puede romper producción o exponer datos) ·
**WARNING** (deuda real, confunde o degrada) · **INFO** (observación,
posiblemente deliberada).

Estado del repositorio auditado: rama `main`, commit `2e8ef56`, con `docs/`
sin versionar.

| #             | Nivel    | Tema                                                                       |
| ------------- | -------- | -------------------------------------------------------------------------- |
| [F-01](#f-01) | RESUELTO | ~~`PLAN.md` citado por código que ya no puede consultarlo~~                |
| [F-02](#f-02) | RESUELTO | ~~El `Dockerfile` copia `public/`, que ya no existe~~                      |
| [F-03](#f-03) | RESUELTO | ~~`token.role` se escribe y nunca se lee~~                                 |
| [F-04](#f-04) | RESUELTO | ~~`revalidatePath("/sitemap.xml")` no invalida la caché real del sitemap~~ |
| [F-05](#f-05) | RESUELTO | ~~`?link=` llega sin validar al `href` de `/pedido/:n/gracias`~~           |
| [F-06](#f-06) | RESUELTO | ~~Objetos huérfanos en R2 al quitar una foto o borrar un producto~~        |
| [F-07](#f-07) | INFO     | El rate limit es por proceso: asume una sola réplica                       |
| [F-08](#f-08) | RESUELTO | ~~El seed guarda el email tal cual; el login lo busca en minúsculas~~      |
| [F-09](#f-09) | RESUELTO | ~~Hay un archivo de tests y ningún test runner~~                           |
| [F-10](#f-10) | RESUELTO | ~~Traducir una nota no revalida la tienda~~                                |
| [F-11](#f-11) | RESUELTO | ~~`Resultado<T>` y `erroresPorCampo()` duplicados en cuatro archivos~~     |
| [F-12](#f-12) | RESUELTO | ~~Dos páginas del panel consultan Prisma directo~~                         |
| [F-13](#f-13) | INFO     | El catálogo se ordena y pagina en memoria                                  |
| [F-14](#f-14) | RESUELTO | ~~`validarCarritoAction` es pública y sin rate limit~~                     |
| [F-15](#f-15) | INFO     | Los totales de pantalla se suman con `Number`                              |
| [F-16](#f-16) | RESUELTO | ~~La reconciliación puede dispararse dos veces~~                           |
| [F-17](#f-17) | RESUELTO | ~~Umami: configurada de punta a punta, nunca implementada~~                |
| [F-18](#f-18) | RESUELTO | ~~`eliminarProducto` no verifica existencia~~                              |
| [F-19](#f-19) | RESUELTO | ~~`precioMostrado` se exige, se valida y no se usa~~                       |
| [F-20](#f-20) | RESUELTO | ~~El `TODO` de los rangos de precio sigue abierto~~                        |
| [F-21](#f-21) | RESUELTO | ~~`Perfumer.name` con mayúsculas inconsistentes, corregido al mostrar~~    |
| [F-22](#f-22) | RESUELTO | ~~`isFeatured` se persiste y ordena, pero no hay control en la UI~~        |
| [F-23](#f-23) | RESUELTO | ~~`ProductVariant.sku` no tiene campo en el formulario~~                   |
| [F-24](#f-24) | RESUELTO | ~~Cuatro columnas del schema sin ningún lector ni escritor~~               |

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

## F-03 · RESUELTO — `token.role` se escribe y nunca se lee

> **Corregido.** Se eliminó la asignación de `src/lib/auth.config.ts` y se
> reescribió el JSDoc, que afirmaba que el rol viajaba "de ahi a la sesion"
> — algo que el callback `session` nunca hizo.
>
> **Por qué borrar y no cablear**: `UserRole` tiene un único valor y hay un
> solo usuario, así que wirear el rol hasta la sesión sería construir
> autorización por roles sin nada que autorizar. Peor: el valor era un
> **literal** `"ADMIN"`, no `user.role` — `authorize()` ni siquiera devuelve el
> rol. Completar ese camino habría dado el rol más alto a cualquiera que se
> loguee. El comentario nuevo deja asentado que, si algún día hace falta, el
> valor tiene que salir de `User.role` y viajar desde `authorize()`.
>
> **Verificado** contra el servidor real (`next dev` en :3010, base de
> desarrollo): ruta protegida sin sesión → 307 a `/admin/login?volverA=…`;
> login → 302 con `authjs.session-token`; ruta protegida con sesión → 200.
> Decodificando el JWT con `next-auth/jwt` y el `AUTH_SECRET` real, los claims
> quedaron en `["email","exp","iat","id","jti","name","sub"]`: `role` ausente,
> `id` presente y consistente con `sub`.

**Lo observado originalmente.** `src/lib/auth.config.ts` escribía
`token.role = "ADMIN"` en el callback `jwt`, el callback `session` copiaba sólo
`token.id`, y esa asignación era la única mención de `role` en todo el código
de aplicación. Compilaba porque `JWT extends Record<string, unknown>`, no
porque hubiera un tipo detrás.

---

<a id="f-04"></a>

## F-04 · RESUELTO — `revalidatePath("/sitemap.xml")` no invalida el sitemap

> **Corregido.** `src/app/sitemap.ts` le agregó `tags: [TAG_SITEMAP_URLS]` al
> `unstable_cache` (constante exportada desde `src/lib/tienda/consultas.ts`,
> junto a `urlsDelSitio`), y `revalidarTienda()` en
> `src/app/admin/(panel)/productos/actions.ts` cambió el `revalidatePath`
> inútil por `revalidateTag(TAG_SITEMAP_URLS, "max")` — el mismo patrón que ya
> usaba `src/lib/configuracion.ts` con `TAG_CONFIGURACION_SITIO` para el mismo
> problema. Perfil `"max"` porque el sitemap es justo el caso que
> `node_modules/next/dist/docs/.../revalidateTag.md` pone de ejemplo
> ("product catalogs"): servir el sitemap viejo mientras se recalcula en el
> fondo es aceptable, a diferencia de `TAG_CONFIGURACION_SITIO`, que usa
> `{ expire: 0 }` porque ahí sí hace falta lectura inmediata.
>
> **Verificado** contra el servidor real (`next dev` en :3010, base de
> desarrollo, con Playwright): se despublicó "Mugler Angel" desde el panel —
> el primer `GET /sitemap.xml` siguiente todavía sirvió el contenido viejo
> (semántica stale-while-revalidate), el segundo ya no incluía
> `/producto/mugler-angel`. Se volvió a publicar y, con el mismo patrón de dos
> requests, el sitemap lo recuperó. Antes de este cambio (`revalidatePath`
> sin tag) el producto habría tardado hasta una hora en reflejarse.

**Lo observado originalmente.** `src/app/admin/(panel)/productos/actions.ts:45`
llamaba a `revalidatePath("/sitemap.xml")` tras guardar, publicar o borrar un
producto. Pero `src/app/sitemap.ts` es `force-dynamic` y su consulta vivía en:

```ts
const urlsCacheadas = unstable_cache(urlsDelSitio, ["sitemap-urls"], {
  revalidate: 3600,
});
```

**sin `tags`**. `revalidatePath` invalida la caché de rutas; no tocaba una
entrada de `unstable_cache` que no declaraba tag.

**Efecto.** Un producto nuevo tardaba **hasta una hora** en aparecer en
`/sitemap.xml`, pese a la llamada explícita. El comentario de `sitemap.ts:14-18`
aceptaba esa latencia de una hora como diseño, así que el impacto real era
bajo — pero la llamada a `revalidatePath` sugería una inmediatez que no
ocurría.

---

<a id="f-05"></a>

## F-05 · RESUELTO — `?link=` sin validar en `/pedido/[number]/gracias`

> **Corregido.** `src/lib/whatsapp.ts` suma `esLinkWhatsappValido()`: exige
> `protocol === "https:"` y `hostname === "wa.me"` vía `new URL()`. `page.tsx`
> lo aplica al `link` del query string antes de pasarlo a `GraciasCliente` —
> cualquier valor que no pase la validación llega como `null`, exactamente
> igual que si no hubiera `?link=` en la URL (mismo fallback que ya existía).
>
> **Verificado** contra el servidor real (`next dev` en :3010, con
> Playwright, porque `GraciasCliente` no renderiza nada hasta hidratarse):
> un `?link=https://wa.me/...?text=...` legítimo se preserva tal cual
> (incluido el texto); un `?link=https://sitio-atacante.example/phish` y un
> `?link=javascript:alert(1)` caen los dos al mensaje genérico de WhatsApp.
> Esto también resuelve el "[No determinado]" original sobre `javascript:`:
> `new URL()` lo parsea con `protocol === "javascript:"`, que la validación
> rechaza.

**Lo observado originalmente.**

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

## F-06 · RESUELTO — Objetos huérfanos en R2

> **Corregido.** `src/app/admin/(panel)/productos/actions.ts` suma
> `borrarSiHuerfanas(storageKeys)`: cuenta cuántas filas de `ProductImage`
> siguen apuntando a cada clave y sólo llama a `borrarObjeto` para las que
> quedaron en cero. Se invoca desde dos lugares, siempre **después** de que
> la escritura en la base ya confirmó (nunca adentro de la transacción, para
> no contar una fila que la propia transacción todavía no borró):
>
> - `sincronizarImagenes()` ahora devuelve los `storageKey` de las filas que
>   borró, y `guardarProducto()` los pasa a `borrarSiHuerfanas` después del
>   `$transaction`.
> - `eliminarProducto()` lee las imágenes del producto **antes** de borrarlo
>   (aprovechando el mismo viaje para la verificación de existencia de
>   F-18) y limpia después del `delete`.
>
> Respeta la complicación real que señalaba el hallazgo: `duplicarProducto()`
> sigue compartiendo `storageKey` a propósito, y `borrarSiHuerfanas` es
> justamente el conteo de referencias que hacía falta para que compartir no
> implique borrar el archivo del otro producto. Es best-effort: si
> `borrarObjeto` falla, no se revierte nada de la base — el objeto queda
> huérfano (el problema original) en vez de perder datos escritos.
>
> **Verificado** contra R2 y el Postgres de desarrollo reales (no mockeados):
> un script subió un objeto de prueba a R2, lo compartió entre dos productos
> creados a mano, borró uno (el objeto sobrevivió, `HeadObjectCommand`
> confirmó 200) y borró el otro (el objeto desapareció, 404). Data de prueba
> y objeto de R2 limpiados al final por el propio script.

**Lo observado originalmente.** `borrarObjeto()` (`src/lib/r2.ts:116`) tenía
exactamente dos
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

## F-08 · RESUELTO — Desajuste de mayúsculas entre el seed y el login

> **Corregido.** `prisma/seed.ts` normaliza `ADMIN_SEED_EMAIL?.toLowerCase()`
> antes de buscar o crear la fila, igual que `authorize()`. No se agregó un
> índice funcional de minúsculas en `User.email`: no hay otra vía para crear
> un usuario (el hallazgo original ya lo señala), así que el único punto de
> entrada que podía introducir el desajuste es este seed.
>
> **Verificado** contra la base de desarrollo real: corriendo el seed con
> `ADMIN_SEED_EMAIL="Test.Case.F08@ParfamMDQ.com"` la fila quedó creada como
> `test.case.f08@parfammdq.com` (log del propio script). Usuario de prueba
> borrado al terminar.

**Lo observado originalmente.**

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

## F-09 · RESUELTO — Un archivo de tests, ningún runner

> **Corregido (con alcance acotado, a pedido de Mateo).** Se instaló Vitest
> (devDependency), se sumó el script `"test": "vitest run"` a
> `package.json`, y `scripts/lib/fragrantica-parse.test.ts` se migró de
> `node:assert/strict` a `describe`/`it`/`expect` de Vitest — mismos 10
> parsers, mismos casos, ahora como 12 tests agrupados. El comentario que
> afirmaba un e2e con Playwright inexistente se corrigió en el propio archivo,
> en `AGENTS.md`, `docs/README.md` y `docs/modules/datos-referencia.md`.
>
> **Deliberadamente fuera de alcance**: Playwright/e2e no se instaló (es un
> cambio de infraestructura más grande — browsers, CI) y `deploy.yml` sigue
> sin correr `pnpm test` (tampoco corre `typecheck` ni `lint`; wirear CI es
> una decisión aparte). Estas dos quedan pendientes si en algún momento se
> quiere ir más allá.
>
> **Verificado**: `pnpm typecheck`, `pnpm lint` y `pnpm test` pasan limpios —
> `vitest run` reporta **12 passed (12)** en 1 archivo.

**Lo observado originalmente.** `scripts/lib/fragrantica-parse.test.ts` existía y usaba
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

## F-10 · RESUELTO — Traducir una nota no revalida la tienda

> **Corregido.** `src/app/admin/(panel)/notas/actions.ts` suma
> `revalidarNota(noteId)`, mismo patrón que `revalidarMarca` en
> `marcas/actions.ts`: busca los productos que referencian la nota vía
> `ProductNote` y revalida `/`, `/catalogo` y la ficha de cada uno. Se llama
> desde `traducirNota` y `borrarTraduccion`, después de guardar. No se tocó
> `crearNotaAction` (vive en `productos/actions.ts`, no en este archivo): el
> hallazgo original ya señala que ahí el efecto es nulo porque una nota
> recién creada no está en ningún producto publicado todavía.
>
> **Verificado** contra el servidor real (`next dev` en :3010, con
> Playwright): la nota "nutmeg" (usada en la pirámide de "Sauvage Elixir",
> ya traducida como "nuez moscada") se retradujo a un valor de prueba desde
> `/admin/notas` — la ficha del producto lo mostró en el **request
> inmediato siguiente**, sin esperar ningún otro invalidador. Traducción
> restaurada a "nuez moscada" al terminar.

**Lo observado originalmente.** `traducirNota` y `borrarTraduccion`
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

## F-11 · RESUELTO — `Resultado<T>` y `erroresPorCampo()` duplicados

> **Corregido.** `src/lib/admin/resultado.ts` tiene el `Resultado<T>` único
> (la versión con `errores?`, que es un superset compatible de la variante
> sin genérico que usaban `marcas` y `configuracion`), y
> `src/lib/validations/errores.ts` tiene el único `erroresPorCampo()`. Los
> seis archivos (`productos`, `imagenes-actions`, `notas`, `pedidos`,
> `marcas`, `configuracion`) ahora hacen `export type { Resultado }` desde el
> import, así que su superficie pública no cambió — nada afuera de estos
> archivos importaba el tipo directamente, pero si algo lo hiciera seguiría
> andando igual. `checkout/actions.ts` importa sólo `erroresPorCampo`: su
> `ResultadoCheckout` es legítimamente distinto (trae `invalidos`) y se dejó
> como estaba, tal como anotaba el hallazgo original.
>
> **Verificado**: `pnpm typecheck`, `pnpm lint` y `pnpm test` pasan limpios
> tras el cambio.

**Lo observado originalmente.** El mismo tipo aparecía, literalmente idéntico, en cuatro archivos:

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

## F-12 · RESUELTO — Dos páginas del panel consultan Prisma directo

> **Corregido.** `getStats()` se movió, igual, a
> `obtenerEstadisticasPanel()` en `src/lib/admin/panel.ts` (nuevo). La
> consulta de `notas/page.tsx` se movió a `listarNotas()` en
> `src/lib/admin/notas.ts` (nuevo), que ahora también hace el cálculo de
> `totalPaginas` que antes vivía en la página. El comentario del índice
> parcial (`nameEs: null`, no una negación equivalente) viajó con la
> consulta a su nuevo archivo.
>
> **Verificado** contra el servidor real (`next dev` en :3010, con
> Playwright): `/admin` sigue mostrando los cuatro números (5 publicados,
> 11 pedidos pendientes, 1.398 notas sin traducir, 69.946 de referencia) y
> `/admin/notas` sigue renderizando sus 51 filas (50 + encabezado) —
> `pnpm typecheck`, `pnpm lint` y `pnpm test` limpios.

**Lo observado originalmente.** El resto del panel leía a través de
`src/lib/admin/*`. Dos excepciones:

- `src/app/admin/(panel)/page.tsx` → `getStats()`, cinco `count()` locales
- `src/app/admin/(panel)/notas/page.tsx` → `findMany` + tres `count()`

**Efecto.** Ninguno funcional. Registrado por consistencia: si `/admin/notas`
crecía (paginado más complejo, exportación), la consulta iba a tener que
mudarse a un `src/lib/admin/notas.ts` que todavía no existía.

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

## F-14 · RESUELTO — `validarCarritoAction` es pública y sin límite

> **Corregido (parcial, a propósito).** `entradaSchema` en
> `carrito/actions.ts` suma `.max(50)` al array: sigue sin `requireAdmin()`
> ni `rateLimit()` porque el hallazgo original ya concluye que no hacen
> falta (dato público, escritura protegida en otro lado) — lo único
> genuinamente flojo era el array sin tope, y eso es lo que se corrigió.
>
> **Verificado**: `pnpm typecheck` y `pnpm lint` limpios, y un chequeo
> directo del schema confirma 50 elementos aceptados y 51 rechazados.

**Lo observado originalmente.** La acción no llamaba a `requireAdmin()` ni a `rateLimit()` — a
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

## F-16 · RESUELTO (parcial, por diseño) — La reconciliación puede dispararse dos veces

> **Corregido para el caso que importa; el resto quedó documentado como
> límite conocido.** `usar-reconciliacion-carrito.ts` suma una variable de
> módulo (`pedidoEnCurso`) que comparten todas las instancias del hook: la
> primera que llega para una firma de carrito dada (`variantId:qty` de cada
> item, ordenados) crea el pedido; cualquier otra instancia que monte
> **mientras ese pedido sigue en vuelo** reutiliza la misma promesa en vez de
> disparar otra. Un flag `aplicado` separado decide quién ejecuta los efectos
> (`quitar`, `toast`, `actualizarPrecio`) una sola vez: es la primera
> instancia que **sigue montada** cuando el pedido resuelve, no
> necesariamente la que lo creó — si esa se desmonta antes (cierran el
> drawer), la que queda igual aplica los efectos.
>
> **Por qué no se cachea "ya reconciliado" a secas.** Cachear por firma de
> carrito sin límite de tiempo evitaría _también_ el caso de abrir el drawer
> mucho después, pero a costa de un riesgo real: si el precio cambia en el
> servidor entre dos montajes con el mismo `variantId:qty`, un cache así
> ocultaría ese cambio en el segundo montaje — justo lo que esta
> reconciliación existe para detectar. Por eso el fix sólo dedupea pedidos
> **superpuestos en el tiempo**, no repeticiones separadas por minutos.
>
> **Verificado** contra el servidor real (`next dev` en :3010, con
> Playwright, carrito armado a mano en `localStorage` con un `variantId`
> inexistente): navegar a `/carrito` y abrir el drawer **lo antes posible**
> (`waitUntil: "commit"` + click inmediato) dio, en 3 corridas seguidas,
> **1 sola** request a Server Actions y **1 solo** toast "Sacamos…", con el
> drawer confirmado abierto las 3 veces. Abrir el drawer bastante después
> de que `/carrito` ya terminó de reconciliar (sin solapamiento) sigue
> disparando una segunda request — es el límite documentado arriba, no una
> regresión: en ese caso no hay overlap que dedupear.
>
> `pnpm typecheck`, `pnpm lint` y `pnpm test` pasan limpios.

**Lo observado originalmente.** `useReconciliacionCarrito()` se llamaba desde dos componentes:

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

## F-17 · RESUELTO — Umami configurada de punta a punta, nunca implementada

> **Corregido, a pedido de Mateo (implementar en vez de sacar la
> plomería).** `src/app/(tienda)/layout.tsx` suma `ScriptUmami()`: si las dos
> env vars están seteadas, inyecta
> `<script src="{NEXT_PUBLIC_UMAMI_URL}/script.js" data-website-id="{NEXT_PUBLIC_UMAMI_WEBSITE_ID}">`
> con `next/script` (`strategy="afterInteractive"`); si falta alguna, no
> renderiza nada — mismo patrón que el resto de `env.ts` con lo opcional.
>
> **Por qué en el layout de la tienda y no en el raíz**: para medir tráfico
> real de clientes, no las propias sesiones del admin en `/admin/*`.
>
> **Verificado** contra el servidor real (`next dev` en :3010, con
> Playwright, porque `next/script` con `afterInteractive` inyecta el tag
> desde JS del cliente y no aparece en el HTML que ve `curl`): sin las env
> vars seteadas, ninguna ruta tiene el script (comportamiento sin cambios).
> Con `NEXT_PUBLIC_UMAMI_URL`/`NEXT_PUBLIC_UMAMI_WEBSITE_ID` de prueba
> seteados, `/` y `/catalogo` sí lo tienen con la URL y el
> `data-website-id` correctos, y `/admin/login` sigue sin él.
> `pnpm typecheck`, `pnpm lint` y `pnpm test` limpios.

**Lo observado originalmente.** `NEXT_PUBLIC_UMAMI_URL` y `NEXT_PUBLIC_UMAMI_WEBSITE_ID`:

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

## F-18 · RESUELTO — `eliminarProducto` no verifica existencia

> **Corregido de paso con F-06**: la limpieza de R2 ya necesitaba leer las
> imágenes del producto antes de borrarlo, así que `eliminarProducto` hace
> ese `findUnique` primero y devuelve `fallo("Ese producto ya no existe.")` si
> no está — mismo criterio que `cambiarEstadoProducto` y `duplicarProducto`.
> Sin verificación adicional por separado: typecheck/lint limpios y la lógica
> es la misma que ya usan las otras acciones del archivo.

**Lo observado originalmente.** `cambiarEstadoProducto`, `duplicarProducto`,
`cambiarEstadoPedido` y `guardarNotasPedido` empezaban buscando la fila y
devolvían `fallo("Ese … ya no existe.")` si no estaba. `eliminarProducto`
(`productos/actions.ts:575-586`) iba directo al `prisma.product.delete`.

**Efecto.** Borrar dos veces (doble click, pestaña vieja) lanzaba `P2025` de
Prisma en vez de devolver `{ ok: false, mensaje }`. El usuario veía el error
genérico de Server Action de Next, no el mensaje del producto.

---

<a id="f-19"></a>

## F-19 · RESUELTO — `precioMostrado` se exige, se valida y no se usa

> **Corregido: se borró, no se cableó.** El campo no tenía ningún lector
> server-side y la detección de cambio de precio que su comentario describía
> ya existe entera del lado del cliente (`useReconciliacionCarrito`); cablearlo
> en el servidor habría sido reimplementar esa misma comparación en un
> segundo lugar. Se sacó de `itemCheckoutSchema`
> (`src/lib/validations/checkout.ts`) y de lo que manda
> `FormularioCheckout` (`items.map` ya no incluye `precioMostrado`).
>
> **Verificado**: `pnpm typecheck` y `pnpm lint` limpios, y un checkout real
> de punta a punta contra el servidor (`next dev` en :3010, con Playwright)
> completó sin el campo — pedido `PM-0016` creado y redirigido a
> `/pedido/PM-0016/gracias` con el link de WhatsApp armado. Pedido de prueba
> borrado al terminar.

**Lo observado originalmente.** `itemCheckoutSchema` (`validations/checkout.ts:13-24`) declaraba
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

## F-20 · RESUELTO — `TODO` abierto en los rangos de precio

> **Corregido.** Mateo confirmó el rango real del catálogo (2026-09-18): de
> $ 0 a $ 1.000.000. `src/lib/tienda/filtros.ts` recalibró
> `RANGOS_PRECIO` / `LIMITES_PRECIO` / `ETIQUETA_PRECIO` a
> `hasta-100000` / `100000-300000` / `300000-600000` / `desde-600000`, y el
> comentario que citaba el seed de desarrollo se reemplazó por la fuente real.
> No hay otro string hardcodeado con los valores viejos (`controles-filtro.tsx`
> y `consultas.ts` sólo importan las constantes), así que no quedó ningún
> lugar con los cortes anteriores.
>
> **Pendiente real:** esto es un punto de partida a ojo sobre el extremo del
> rango, no una calibración por cuartiles de la distribución real — si el
> catálogo resulta muy asimétrico (muchos decants baratos, pocos frascos
> caros), estos cortes van a agrupar mal. Ajustar con la distribución real
> cuando haya suficientes productos cargados.

**Lo observado originalmente.** `src/lib/tienda/filtros.ts`:

> `TODO: revisar los cortes contra los precios reales del catalogo; hoy estan
calibrados contra los del seed de desarrollo (scripts/seed-dev.ts).`

Los cortes (`hasta-50000`, `50000-100000`, `100000-200000`, `desde-200000`)
estaban calibrados contra `scripts/seed-dev.ts`, no contra el catálogo real.

---

<a id="f-21"></a>

## F-21 · RESUELTO — `Perfumer.name` inconsistente, corregido al mostrar

> **Corregido: los tres call-sites del panel ahora pasan por
> `nombrePropio()`.**
>
> - `referenciaParaAdoptar()` (`src/lib/admin/referencias.ts`): el perfumista
>   ya llega con Title Case al precargar una referencia adoptada.
> - `productoParaEditar()` (`src/lib/admin/productos.ts`): idem al editar un
>   producto ya guardado.
> - `buscarPerfumistasAction()` (`productos/actions.ts`): además de mostrar
>   el nombre normalizado, se sacó el `orderBy: { name: "asc" }` de Postgres
>   (que ordenaba por bytes, mayúsculas primero) y se ordena en JS con
>   `localeCompare("es-AR")` sobre el nombre ya normalizado — la tabla entera
>   son ~1.400 filas, ordenar en memoria no pesa.
>
> No se tocó `nombrePropio()` ni la base: sigue siendo la misma decisión
> documentada (normalizar al mostrar, no pisar correcciones a mano). Tampoco
> se tocó el importador (deuda que el propio comentario ya señala aparte).
>
> **Verificado** contra el servidor real (`next dev` en :3010, con
> Playwright, admin logueado): en `/admin/productos/:id` de "Sauvage Elixir",
> el chip de perfumista ya asignado muestra "François Demachy" (antes
> crudo). Buscando "paul" en el combobox de perfumistas aparecen 17
> resultados, todos en Title Case y alfabéticamente ordenados ("Jean-paul
> Guerlain" … "Paulo de Moraes"). `referenciaParaAdoptar()` verificado aparte
> con un script: perfumista devuelto como "Paul Vacher", no "paul vacher".
> `pnpm typecheck`, `pnpm lint` y `pnpm test` limpios.

**Lo observado originalmente.** `src/lib/catalogo.ts:97-108` documenta que `Perfumer.name` quedó
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

## F-22 · RESUELTO — `isFeatured` se persiste y ordena, pero no se puede activar

> **Corregido: se agregó el interruptor que faltaba.**
> `src/app/admin/(panel)/productos/_components/producto-form.tsx` suma un
> `<Switch>` con `Controller` sobre `isFeatured` en la barra pegada abajo del
> formulario (junto a "Guardar borrador" / "Publicar producto"), con un
> ícono de estrella que se rellena cuando está activo. No hizo falta tocar
> `guardarProducto`, `productoSchema` ni `valoresIniciales()`: ya leían y
> escribían `isFeatured` — sólo faltaba el control.
>
> **Verificado** contra el servidor real (`next dev` en :3010, con
> Playwright): "Le Male Elixir" no tenía ninguna variante destacada; se
> activó el switch (`aria-checked` de `false` a `true`), se guardó, y
> `Product.isFeatured` quedó en `true` en la base. El orden de `/catalogo`
> (que por defecto es "novedades": destacados primero) puso ese producto en
> primer lugar donde antes estaba en el medio. Revertido a `false` al
> terminar. `pnpm typecheck`, `pnpm lint` y `pnpm test` limpios.

**Lo observado originalmente.** `Product.isFeatured` estaba completamente cableado:

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

## F-23 · RESUELTO — `ProductVariant.sku` no tiene campo en el formulario

> **Corregido: se agregó el input que faltaba.** `EditorVariantes`
> (`editor-variantes.tsx`) suma una columna "SKU" con `Controller` sobre
> `variants.${indice}.sku` (mismo patrón que `sizeMl`/`priceArs`: input
> controlado, `""` se traduce a lo que espera el schema). La grilla pasó de
> cinco a seis columnas (`COLUMNAS`). No hizo falta tocar
> `sincronizarVariantes()`, `varianteSchema` ni `valoresIniciales()`: ya
> leían y escribían `sku`, sólo faltaba el control — y eso significa que el
> comentario de `duplicarProducto` ("el SKU no se copia: es identificador
> único del original") ahora sí protege algo que un admin puede completar.
>
> **Verificado** contra el servidor real (`next dev` en :3010, con
> Playwright): se escribió `SAUV-100-TEST` en el SKU de una variante de
> "Sauvage Elixir", se guardó, y **tras un reload completo de la página**
> el input siguió mostrando ese valor — confirmado también contra la base
> (`ProductVariant.sku`). Revertido a `null` al terminar.
> `pnpm typecheck`, `pnpm lint` y `pnpm test` limpios.

**Lo observado originalmente.** `sku` estaba en el schema, en `varianteSchema`
(`textoOpcional(64)`), se precarga en `valoresIniciales()`
(`producto-form.tsx:114`) y se persiste en `sincronizarVariantes()`. `EditorVariantes`
tiene `Controller` para `isActive`, `kind`, `sizeMl` y `priceArs` — **no para
`sku`**; la única mención es `sku: null` al agregar una variante nueva.

**Efecto.** El SKU sólo puede llegar a la base por fuera del panel. El comentario
de `duplicarProducto` (_"El SKU no se copia: es identificador único del
original"_) protege un campo que hoy nadie puede completar.

---

<a id="f-24"></a>

## F-24 · RESUELTO — Columnas del schema sin lector ni escritor

> **Corregido, a pedido de Mateo: se borraron, no se documentaron de más.**
> Migración `20260918203922_quitar_columnas_sin_uso`: `DROP COLUMN` de
> `Product.sortOrder` y `SiteSetting.logoUrl` / `heroImageUrl` /
> `announcementBar`. `prisma migrate deploy` la aplicó a la base de
> desarrollo y `prisma generate` regeneró el cliente — nada en `src/` las
> referenciaba fuera del cliente autogenerado, así que no hizo falta tocar
> ningún otro archivo de código. Se actualizaron las menciones en
> `docs/persistence.md` y `docs/modules/configuracion-sitio.md`.
>
> **Es una migración irreversible sin restaurar de un backup** (dropea
> columnas con datos, aunque los de hoy eran sólo `NULL`/`0` por defecto —
> `Product.sortOrder` tenía 6 filas en `0`). Se aplicó sólo contra la base de
> **desarrollo** en esta sesión; en producción la corre el entrypoint del
> contenedor (`prisma migrate deploy`) en el próximo deploy, como cualquier
> otra migración — ver [`deployment.md`](deployment.md).
>
> **Verificado**: `pnpm typecheck`, `pnpm lint` y `pnpm test` limpios tras
> regenerar el cliente. Contra el servidor real (`next dev` en :3010, con
> Playwright): `/`, `/catalogo` y una ficha de producto siguen en 200;
> guardar `/admin/configuracion` y publicar un producto desde
> `/admin/productos/:id` no tiraron ningún error.

**Lo observado originalmente.** `grep -rn "logoUrl\|heroImageUrl\|announcementBar" src/ scripts/ prisma/seed.ts` no
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
