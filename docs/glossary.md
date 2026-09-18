# Glosario

El código y los identificadores están en inglés; la UI y los comentarios, en
español rioplatense sin tildes en los identificadores. Esta tabla traduce entre
los tres vocabularios: **dominio (perfumería)**, **modelo (Prisma)** y
**código (funciones y archivos)**.

---

## Dominio: perfumería

| Término                             | Qué es                                                                                                         | Dónde aparece                                           |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Frasco entero** (`FULL_BOTTLE`)   | El producto sellado, con estuche y packaging original                                                          | `VariantKind`                                           |
| **Tester** (`TESTER`)               | El mismo perfume en envase simple, sin estuche. Más barato, igual de original                                  | `VariantKind`, `/que-es-un-tester`                      |
| **Decant** (`DECANT`)               | Una fracción pasada a un atomizador chico, para probar antes de comprar el frasco                              | `VariantKind`. Es el diferencial de precio del negocio  |
| **Nota** (`Note`)                   | Un ingrediente olfativo ("bergamota", "sándalo")                                                               | `Note`, `ProductNote`                                   |
| **Pirámide**                        | Las notas agrupadas por momento de evaporación: **salida** (`TOP`), **corazón** (`MIDDLE`), **fondo** (`BASE`) | `NotePosition`, `NIVELES`, `Piramide`                   |
| **Acorde** (`Accord`)               | La familia olfativa resultante ("amaderado", "cítrico"). Tiene color propio                                    | `Accord`, `ChipAcorde`                                  |
| **Perfumista / nariz** (`Perfumer`) | Quien compuso la fragancia                                                                                     | `Perfumer`                                              |
| **Concentración**                   | Proporción de aceite: `EAU_FRAICHE` < `EAU_DE_COLOGNE` < `EDT` < `EDP` < `PARFUM` < `EXTRAIT`                  | `Concentration`, `CONCENTRACION`, `CONCENTRACION_CORTA` |
| **Duración** (`longevity`)          | Cuánto dura sobre la piel. 1-5, **fijada por el admin**, no votada                                             | `Product.longevity`, `BarrasCaracter`                   |
| **Estela** (`sillage`)              | Cuánto rastro deja. 1-5, fijada por el admin                                                                   | `Product.sillage`                                       |
| **Intensidad** (`intensity`)        | Qué tan fuerte proyecta. 1-5, fijada por el admin                                                              | `Product.intensity`                                     |
| **Fragrantica**                     | Sitio de referencia del que salen los dos CSV                                                                  | `data/fragrantica/`, `FragranceRef`                     |
| **PID**                             | El id numérico de Fragrantica, al final de la URL. Clave de join entre los dos CSV                             | `FragranceRef.pid`                                      |

---

## Modelo de datos

| Modelo                       | Es                                                                    | Capa                |
| ---------------------------- | --------------------------------------------------------------------- | ------------------- |
| `FragranceRef`               | Una fragancia **de referencia** (69.948). No se publica nunca         | Referencia          |
| `Brand`                      | Marca/casa. **Compartida** entre referencia y tienda                  | Referencia + Tienda |
| `Note`, `Accord`, `Perfumer` | Vocabularios compartidos                                              | Referencia + Tienda |
| `Product`                    | Lo que se **vende**: lo edita el admin, lo ve el cliente              | Tienda              |
| `ProductVariant`             | Una presentación comprable, con precio. Sin stock                     | Tienda              |
| `ProductImage`               | Una foto propia. Guarda la **clave** del objeto en R2                 | Tienda              |
| `Order` / `OrderItem`        | Un pedido y sus líneas, con **snapshot** de nombre, variante y precio | Operación           |
| `SiteSetting`                | Fila **única** (`id: "singleton"`) con todo lo editable del sitio     | Operación           |
| `User`                       | El admin. Único rol posible                                           | Operación           |

### Estados

| Enum            | Valores                                             | Significado                                                                             |
| --------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `ProductStatus` | `DRAFT` · `PUBLISHED`                               | Sólo `PUBLISHED` es alcanzable desde la tienda, incluso por slug directo                |
| `OrderStatus`   | `PENDING` → `CONFIRMED` → `DELIVERED` · `CANCELLED` | Lo mueve el admin a mano. **No hay máquina de estados**: cualquier transición es válida |
| `Gender`        | `WOMEN` · `MEN` · `UNISEX`                          | "Para ella" / "Para él" / "Unisex"                                                      |
| `Season`        | `SUMMER` · `FALL` · `WINTER` · `SPRING`             | Array en `Product.seasons`                                                              |
| `Occasion`      | `DAY` · `NIGHT` · `CASUAL` · `FORMAL`               | Array en `Product.occasions`                                                            |
| `UserRole`      | `ADMIN`                                             | Un solo valor: no hay RBAC                                                              |

---

## Vocabulario del código

### Verbos recurrentes

| Español (código)        | Inglés       | Qué hace                                                                                                          |
| ----------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------- |
| **adoptar**             | _adopt_      | Crear un `Product` copiando los datos de una `FragranceRef`. `adoptarReferenciaAction`, `PasoReferencia`          |
| **revalidar** (carrito) | _revalidate_ | Comprobar contra la base qué items del carrito siguen siendo comprables. `revalidarItemsCarrito`                  |
| **reconciliar**         | —            | Aplicar el resultado de esa revalidación al carrito del cliente. `useReconciliacionCarrito`                       |
| **sincronizar**         | _sync_       | Dejar las hijas de un producto iguales a lo que mandó el formulario. `sincronizarRelaciones/Variantes/Imagenes`   |
| **revalidar** (caché)   | _revalidate_ | `revalidatePath` / `revalidateTag` de Next. `revalidarTienda`, `revalidarMarca`, `revalidarPedido`                |
| **listar**              | _list_       | Consulta de tabla o grilla. `listarCatalogo`, `listarProductos`, `listarPedidos`, `listarMarcas`, `listarAcordes` |
| **guardar**             | _save_       | Escritura del formulario. `guardarProducto`, `guardarConfiguracion`, `guardarNotasPedido`                         |
| **armar**               | _build_      | Construir un string/objeto derivado. `armarMensajePedido`                                                         |

### Sustantivos que confunden si se leen de más

| Término                           | Lo que **es**                                                     | Lo que **no** es                      |
| --------------------------------- | ----------------------------------------------------------------- | ------------------------------------- |
| **referencia**                    | Una fila de `FragranceRef`, dato interno del panel                | No es un producto ni algo publicable  |
| **presentación**                  | `VariantKind` (frasco/tester/decant)                              | No es el `sizeMl`                     |
| **variante**                      | Una fila de `ProductVariant` = presentación + tamaño + precio     | No es una variante de color ni de SKU |
| **etiqueta** (`etiquetaVariante`) | El texto visible: `"Decant 10 ml"`                                | No es el cartel de la tarjeta         |
| **etiqueta** (`EtiquetaTarjeta`)  | El cartel de la tarjeta: `NUEVO` / `DECANT` / `TESTER`            | No es la etiqueta de variante         |
| **desde**                         | El precio más barato entre las variantes **activas**, como string | No es un rango ni una fecha           |
| **honeypot** / **empresa**        | Campo oculto del checkout que un bot completa y un humano no      | No es un dato del pedido              |
| **singleton**                     | El `id` literal de la única fila de `SiteSetting`                 | No es un patrón de objeto             |
| **proxy**                         | `src/proxy.ts`: en Next 16 así se llama el ex `middleware.ts`     | No es un proxy HTTP                   |
| **snapshot**                      | Los campos copiados en `OrderItem` al cerrar el pedido            | No es un backup                       |

---

## Convenciones de nombres

| Convención                                            | Ejemplo                                                | Por qué                                                   |
| ----------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| Modelos y columnas en **inglés**                      | `Product.priceArs`, `ProductImage.storageKey`          | Estándar de Prisma                                        |
| Funciones y variables en **español sin tildes**       | `listarCatalogo`, `precioDesde`, `etiquetaVariante`    | `AGENTS.md`                                               |
| Textos de UI en **español con tildes (es-AR, voseo)** | _"Elegí tu presentación"_, _"Poné tu nombre completo"_ | `AGENTS.md`                                               |
| Query params en **español**                           | `?genero=MEN&presentacion=DECANT&orden=precio-asc`     | Los ve el usuario en la barra de direcciones              |
| Valores de enum en **inglés**                         | `PUBLISHED`, `DECANT`, `WOMEN`                         | Son datos; las etiquetas es-AR viven en `lib/catalogo.ts` |
| Rutas en **español**                                  | `/producto/:slug`, `/marca/:slug`, `/carrito`          | Cara al usuario                                           |
| Carpetas `_components/`                               | `productos/_components/`                               | Convención de Next: no genera ruta                        |

---

## Siglas y abreviaturas

| Sigla               | Significado                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **ARS**             | Peso argentino. `Decimal(10,2)`, nunca float                                                                                         |
| **E.164**           | Formato internacional de teléfono: `+5492236163910`. Es como se guarda `Order.customerPhone` y `SiteSetting.whatsappNumber`          |
| **EDP / EDT / EDC** | Eau de Parfum / de Toilette / de Cologne                                                                                             |
| **OG**              | Open Graph: la imagen de vista previa al compartir un link                                                                           |
| **R2**              | Cloudflare R2, el object storage compatible con S3                                                                                   |
| **RSC**             | React Server Component                                                                                                               |
| **GHCR**            | GitHub Container Registry                                                                                                            |
| **WCAG AA**         | El nivel de contraste (4,5:1 para texto normal) que garantiza `colorDeChip()`                                                        |
| **trgm**            | `pg_trgm`, la extensión de trigramas que hace indexable el `LIKE '%…%'`                                                              |
| **`.dc.html`**      | Mockups de diseño (`design/*.dc.html`), borrados del repo. Todavía citados en 32 comentarios — ver [`findings.md`](findings.md#f-01) |
