# Design System — Parfam MDQ

Documento de **referencia**, no normativo. Describe la identidad visual que
**ya existe en el código** (Parte A) y propone mejoras **sin implementarlas**
(Parte B). El refactor en curso es explícitamente sin cambios de
comportamiento: nada de acá habilita un rediseño.

Regla de lectura: **si este documento contradice al código, gana el código**
(igual que `docs/`, ver `AGENTS.md`). Todo dato de la Parte A lleva su path.

Fecha de extracción: 2026-09-20 · rama `refactor/cleanup` · commit `53f5c93`.

---

## Índice

- [Parte A — Lo que ya hay](#parte-a--lo-que-ya-hay)
  - [A.1 Stack visual y configuración](#a1-stack-visual-y-configuración)
  - [A.2 Paleta y tokens de color](#a2-paleta-y-tokens-de-color)
  - [A.3 Tipografía](#a3-tipografía)
  - [A.4 Radios](#a4-radios)
  - [A.5 Espaciado, grilla y contenedores](#a5-espaciado-grilla-y-contenedores)
  - [A.6 Iconografía e imágenes](#a6-iconografía-e-imágenes)
  - [A.7 Patrones de componente existentes](#a7-patrones-de-componente-existentes)
  - [A.8 Estados: carga, vacío, error](#a8-estados-carga-vacío-error)
  - [A.9 Responsive y modo oscuro](#a9-responsive-y-modo-oscuro)
  - [A.10 Tono de voz](#a10-tono-de-voz)
  - [A.11 Patrón de interacción del checkout por WhatsApp](#a11-patrón-de-interacción-del-checkout-por-whatsapp)
  - [A.12 Accesibilidad que ya está resuelta](#a12-accesibilidad-que-ya-está-resuelta)
- [Parte B — Mejoras y arreglos propuestos](#parte-b--mejoras-y-arreglos-propuestos)
  - [Tabla resumen rankeada](#tabla-resumen-rankeada)
  - [B-01 … B-10 (detalle)](#b-01--contraste-de---destructive-por-debajo-de-aa-en-claro)
  - [Apéndice: hallazgos menores](#apéndice-hallazgos-menores)
  - [Mediciones de contraste](#mediciones-de-contraste-reproducibles)

---

# Parte A — Lo que ya hay

## A.1 Stack visual y configuración

| Pieza             | Valor real                                                                  | Path                                       |
| ----------------- | --------------------------------------------------------------------------- | ------------------------------------------ |
| Preset shadcn     | `radix-nova`, `baseColor: neutral`, `cssVariables: true`, sin prefijo       | `components.json`                          |
| Iconos            | Lucide (`iconLibrary: "lucide"`)                                            | `components.json`                          |
| CSS raíz          | `@import "tailwindcss"` + `tw-animate-css` + `shadcn/tailwind.css`          | `src/app/globals.css:1-3`                  |
| Variante dark     | `@custom-variant dark (&:is(.dark *))`                                      | `src/app/globals.css:5`                    |
| Tema              | `next-themes`, `attribute="class"`, `defaultTheme="system"`, **sin toggle** | `src/components/tienda/theme-provider.tsx` |
| Toasts            | `sonner` con `position="top-right" richColors`                              | `src/app/(tienda)/layout.tsx`              |
| Estado de filtros | `nuqs` (`NuqsAdapter` en el layout de tienda)                               | `src/app/(tienda)/layout.tsx`              |

La capa `@theme inline` de `globals.css:7-51` re-expone cada variable de
`:root` como token de Tailwind (`--color-primary: var(--primary)`, etc.). Es
la razón por la que `bg-whatsapp` o `text-success-foreground` funcionan como
utilidades sin registrar nada más.

## A.2 Paleta y tokens de color

Identidad declarada en `src/app/globals.css:53-55`: **crema `#F2EEE9` sobre
tinta negra**. Todos los valores son OKLCH con el hex de referencia en
comentario.

### Modo claro (`:root`, `globals.css:53-107`)

| Token                                  | OKLCH                 | Hex       | Rol observado                                                                   |
| -------------------------------------- | --------------------- | --------- | ------------------------------------------------------------------------------- |
| `--background`                         | `0.9508 0.008 73.74`  | `#F2EEE9` | Fondo de página y fondo de la foto en la tarjeta                                |
| `--foreground`                         | `0 0 0`               | `#000000` | Texto principal; también el `<h1>` del hero                                     |
| `--card`                               | `0.9798 0.0045 78.3`  | `#FAF8F5` | Superficie elevada: tarjetas, panel de filtros, ficha técnica, resumen          |
| `--popover`                            | igual a `--card`      | `#FAF8F5` | Select, dropdown, tooltip                                                       |
| `--primary`                            | `0 0 0`               | `#000000` | CTA sólido, chip de filtro activo, badge de etiqueta, barras de carácter llenas |
| `--primary-foreground`                 | `0.9508 0.008 73.74`  | `#F2EEE9` | Texto sobre primary                                                             |
| `--secondary` / `--muted` / `--accent` | `0.915 0.0138 78.26`  | `#E8E2D9` | Fondos tenues, hover de chips, relleno del frasco placeholder                   |
| `--muted-foreground`                   | `0.5095 0.0158 78.18` | `#6B655C` | Texto secundario, eyebrows en versalitas, metadatos                             |
| `--destructive`                        | `0.577 0.245 27.325`  | `#E7000B` | Errores de formulario, acciones destructivas del panel                          |
| `--border` / `--input`                 | `0.8756 0.0168 79.34` | `#DCD5CA` | Bordes de tarjeta, separadores, borde de input                                  |
| `--ring`                               | `0.5095 0.0158 78.18` | `#6B655C` | Anillo de foco                                                                  |
| `--radius`                             | —                     | `0.25rem` | Ver A.4                                                                         |

### Tokens propios (fuera del preset shadcn)

Dos familias que **no** vienen de shadcn y están declaradas a mano:

**`--success` / `--success-foreground` / `--success-border`**
`globals.css:73-77`. Etiqueta tenue de "publicado" / "confirmado". Es el
único verde desaturado de la paleta y existe para no pelearse con los chips
de acordes.

| Token                  | Claro     | Oscuro                       |
| ---------------------- | --------- | ---------------------------- |
| `--success`            | `#DFECDF` | `oklch(0.2846 0.0342 148.3)` |
| `--success-foreground` | `#305A38` | `oklch(0.7684 0.1132 147.2)` |
| `--success-border`     | `#B9D2BC` | `oklch(0.3705 0.0508 147.5)` |

Uso real: **solo en el panel**, nunca en la tienda —
`src/app/admin/(panel)/pedidos/_components/chip-estado-pedido.tsx:15-23`,
`src/app/admin/(panel)/productos/_components/fila-acciones.tsx:68-75`,
`.../paso-referencia.tsx:171`.

**`--whatsapp` / `--whatsapp-foreground`** `globals.css:78-88`.

| Token                   | Claro y oscuro (idéntico)                |
| ----------------------- | ---------------------------------------- |
| `--whatsapp`            | `oklch(0.5175 0.137 149.95)` = `#107D3A` |
| `--whatsapp-foreground` | `oklch(0.9508 0.008 73.74)` = `#F2EEE9`  |

El comentario del código documenta por qué no es el `#1DA851` del mockup:
ese hex da 2,68:1 contra el texto crema y no llega al 4,5:1 de WCAG AA.
`#107D3A` da **4,53:1** (verificado, ver mediciones al final). No varía entre
claro y oscuro **a propósito**: el contraste es interno al botón.

Uso real (4 call-sites, siempre botón sólido):
`src/components/tienda/carrito/resumen-carrito.tsx:41`,
`src/app/(tienda)/checkout/_components/formulario-checkout.tsx:253`,
`src/app/(tienda)/pedido/[number]/gracias/_gracias-cliente.tsx:66`,
`src/app/admin/(panel)/pedidos/[id]/page.tsx:72`.

### Sidebar del panel

`globals.css:97-106`. El panel de admin invierte: sidebar tinta
(`#14120F`) con texto `#D6CFC5` sobre la tienda crema. Se lee como
herramienta interna sin salirse de la marca.

### Modo oscuro (`.dark`, `globals.css:109-145`)

Inversión crema/tinta manteniendo el matiz cálido: `--background #14120F`,
`--foreground #F2EEE9`, `--card #1F1C18`, `--muted-foreground #A39B8E`,
`--border #3A342C`.

### Charts

`--chart-1..5` existen en los dos modos (`globals.css:91-95` y `137-141`) y
son una **rampa neutra cálida** de claro a oscuro, no cinco hues. **No hay un
solo uso en `src/`** (verificado con grep): son herencia del preset.

### El color que no es un token

`src/components/tienda/chip-acorde.tsx` + `src/lib/color.ts`. El color de
cada acorde es **un dato de la base** (`Accord.color`, del diccionario en
`data/dictionaries/accords.es.json`), no una decisión de tema, así que va
inline. `colorDeChip()` garantiza 4,5:1: elige tinta `#14120F` o crema
`#F2EEE9` según cuál contraste mejor y, si ninguna llega, corre el fondo
hacia el extremo opuesto en pasos de 2% hasta alcanzar el umbral (máximo 8%
sobre el diccionario actual). Es la única excepción legítima a "todo sale de
un token".

También inline y por el mismo motivo: el puntito de color del acorde en el
select de familia olfativa (`catalogo/controles-filtro.tsx:170-173`).

## A.3 Tipografía

**Una sola familia: Outfit.** No hay pairing.

| Dónde          | Cómo se carga                                                                                                                 | Path                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Toda la web    | `next/font/google` → `Outfit`, `variable: "--font-sans"`, `subsets: ["latin"]`, sin `weight` (variable font, todos los pesos) | `src/app/layout.tsx:6-9`                                         |
| Token Tailwind | `--font-sans: var(--font-sans)` y `--font-heading: var(--font-sans)` en `@theme inline`                                       | `src/app/globals.css:10-11`                                      |
| Aplicación     | `html { @apply font-sans }` en `@layer base`                                                                                  | `src/app/globals.css:150-152`                                    |
| Favicon y OG   | `src/assets/fonts/Outfit-ExtraBold.ttf` (800, licencia OFL en la misma carpeta) leído con `readFile`                          | `src/app/icon.tsx:17`, `src/app/(tienda)/opengraph-image.tsx:31` |

El `.ttf` local existe **solo** porque `ImageResponse` no puede usar
`next/font`: hay que pasarle el binario. La web nunca lo descarga.
`--font-heading` apunta a la misma familia, así que hoy no distingue nada.

### Pesos en uso (conteo real sobre `src/`)

`font-bold` 62 · `font-semibold` 48 · `font-medium` 45 · `font-extrabold` 25
· `font-normal` 1 · `font-light` 1 (el tagline en itálica del hero,
`tienda/hero.tsx:26`).

### Los tres registros tipográficos del sitio

1. **Display / logotipo** — `font-extrabold` + `tracking` negativo fuerte.
   `Logotipo` (`tienda/logotipo.tsx`) es tipografía, no SVG: nombre en peso
   800 con `tracking-[-0.03em]` y `leading-[0.9]`, más un subtítulo
   "Perfumeria" en versalitas muy espaciadas (`tracking-[0.42em]` a
   `[0.62em]`) con `pl-[0.42em]` para recentrar la última letra. Tres
   tamaños: `barra` (`text-xl`), `hero` (`text-6xl → text-[132px]`), `pie`
   (`text-2xl`, subtítulo en `sr-only`).
2. **Títulos** — `font-extrabold` + `tracking` de `-0.015em` a `-0.035em`.
   H1 de ficha: `text-[32px] lg:text-[52px] tracking-[-0.035em]`
   (`producto/[slug]/page.tsx:130`). H1 de checkout: `text-4xl sm:text-[46px]
tracking-[-0.03em]`. Título de sección de catálogo: `text-[32px]
lg:text-[44px] tracking-[-0.03em]`. H2 de bloque: `text-xl font-bold
tracking-[-0.015em]` (`ficha-tecnica.tsx`, `barras-caracter.tsx`).
3. **Eyebrow / versalitas** — el recurso más característico después del
   logotipo: `text-[9px]`…`text-[11px]`, `font-bold`, `uppercase`,
   `tracking` positivo de `0.12em` a `0.2em`, `text-muted-foreground`.
   Aparece en marca de tarjeta, títulos de columna del footer, etiquetas de
   fila de filtros, nivel de pirámide, "Elegí tu presentación", "Último
   paso", "VER CATÁLOGO".

### Precios

Siempre `font-extrabold` o `font-bold` con `tracking` negativo, escalonados
por jerarquía: tarjeta `text-base sm:text-xl`, ficha `text-[38px]`,
subtotal del drawer `text-3xl`, total del checkout `text-[32px]`.
Formato: `Intl.NumberFormat("es-AR", { currency: "ARS",
maximumFractionDigits: 0 })` en `src/lib/catalogo.ts:86-95` — **el único
formateador de precio**.

## A.4 Radios

`--radius: 0.25rem` (`globals.css:96`). La escala de `@theme inline`
(`globals.css:44-50`) es multiplicativa:

| Token          | Fórmula                     | Valor efectivo     |
| -------------- | --------------------------- | ------------------ |
| `--radius-sm`  | `calc(var(--radius) * 0.6)` | `0.15rem` (2,4 px) |
| `--radius-md`  | `calc(var(--radius) * 0.8)` | `0.2rem` (3,2 px)  |
| `--radius-lg`  | `var(--radius)`             | `0.25rem` (4 px)   |
| `--radius-xl`  | `calc(var(--radius) * 1.4)` | `0.35rem` (5,6 px) |
| `--radius-2xl` | `× 1.8`                     | `0.45rem`          |
| `--radius-3xl` | `× 2.2`                     | `0.55rem`          |
| `--radius-4xl` | `× 2.6`                     | `0.65rem`          |

Dato no obvio verificado en la fuente de Tailwind v4
(`node_modules/tailwindcss/dist/lib.js`, utilidad `rounded` con
`themeKeys: ["--radius"]`): la clase **`rounded` sin sufijo resuelve a
`var(--radius)`**, es decir es idéntica a `rounded-lg` en este proyecto. Por
eso el storefront (`rounded`) y los primitivos de shadcn (`rounded-lg`) se
ven iguales pese a escribirlo distinto.

En la práctica el sitio es **casi recto**: 4 px es el radio de todo lo
grande (tarjetas, inputs, botones, paneles) y `rounded-full` queda reservado
al contador del carrito y al punto de color del acorde.

## A.5 Espaciado, grilla y contenedores

- **Contenedor**: `mx-auto max-w-[1440px]` repetido literalmente en 8
  archivos (header, footer, sección de catálogo, y las páginas de checkout,
  carrito, catálogo, producto y marca).
- **Gutters**: `px-5` en mobile → `lg:px-16` en desktop. El par aparece 12
  veces.
- **Grilla de catálogo**: `grid-cols-2 gap-3.5 lg:grid-cols-4 lg:gap-7`
  (`catalogo/grilla.tsx:57`), replicada tal cual en `grilla-skeleton.tsx` y
  con `gap-5` en los relacionados de la ficha.
- **Ficha de producto**: columna de galería fija `lg:w-[620px] lg:shrink-0` +
  columna de compra flexible, `gap-9 lg:gap-14`.
- **Checkout**: formulario `max-w-[680px]` + resumen `lg:w-[440px]`.
- **Hero**: alto fijo `h-[520px] lg:h-[720px]`.
- **Secciones de la ficha**: separadas por `border-t pt-11`.

La escala de Tailwind convive con valores arbitrarios heredados de los
mockups: `p-[30px]` (ficha técnica, carácter), `p-[22px_24px]` (panel de
filtros), `gap-[72px]` (columnas del footer desktop), `gap-[11px]` y
`gap-[18px]` (drawer y panel de filtros), `px-[18px]` (chips), `py-[22px]`
(CTA del checkout).

### Alturas de control

| Contexto                                           | Alto                            |
| -------------------------------------------------- | ------------------------------- |
| Botón shadcn `default` / input / select trigger    | `h-8` (32 px)                   |
| Buscador y chip de filtro en desktop               | `h-9` (36 px)                   |
| Cuadrados de icono del header mobile y chip táctil | `46 px`                         |
| Inputs y selects del drawer mobile                 | `h-[50px]`                      |
| Botones de acción del drawer (Limpiar / Ver N)     | `h-[54px]`                      |
| Trigger "Filtrar · N"                              | `h-12` (48 px)                  |
| CTA de WhatsApp                                    | `h-auto` + `py-5` / `py-[22px]` |

Los CTA grandes se construyen siempre igual: `<Button>` de shadcn con
`h-auto` para anular el `h-8` del primitivo, más `py-*` y `text-[15px]`.

## A.6 Iconografía e imágenes

- **Lucide**, tamaños explícitos: `size-4` general, `size-[17px]` / `size-[19px]`
  en el header, `size-5` en el CTA del checkout. `strokeWidth={1.6}` en los
  iconos del header (más finos que el 2 por defecto).
- Set en uso: `Menu`, `Search`, `ShoppingBag`, `ChevronDown`,
  `SlidersHorizontal`, `MessageCircle`, `Minus`, `Plus`, `X`, `ShieldCheck`,
  `Loader2`.
- **Fotos**: `next/image` con `fill` + `object-contain p-4`
  (`tienda/foto-producto.tsx`). `contain` y no `cover` a propósito: son
  frascos recortados sobre crema y `cover` les comería la tapa. `sizes`
  siempre explícito; `priority` en las 4 primeras tarjetas de la grilla y en
  la primera foto de la galería.
- **Placeholder**: silueta de frasco en SVG inline pintada con tokens
  (`fill-border` / `fill-secondary`) para que siga el tema —
  `src/components/frasco-placeholder.tsx`.
- Nunca se muestran imágenes de Fragrantica: son referencia interna del panel.

## A.7 Patrones de componente existentes

### Tarjeta de producto — `tienda/tarjeta-producto.tsx`

El componente más reutilizado (grilla, home, relacionados). Estructura fija:

```
<Link>  group · rounded · border · bg-card · hover:border-foreground
  ├ franja de foto   h-[180px] sm:h-[260px] · border-b · bg-background
  │   └ badge de etiqueta opcional (absolute top-3 left-3, bg-primary, 9px versalita)
  └ cuerpo  p-3.5 sm:p-[18px] · gap-1.5
      ├ marca      versalita 9/10px muted
      ├ nombre     h2|h3 · text-sm sm:text-lg · font-bold · tracking -0.015em
      ├ meta       text-xs muted (oculto en mobile)
      ├ precio     "desde" + monto bold (mt-auto, lo empuja al pie)
      └ tamaños    chips con borde, 10px (solo sm+)
```

Dos decisiones explícitas: el hover es **cambio de borde**, no sombra ni
`scale`; y el nivel del encabezado es una prop (`nivel: "h2" | "h3"`) para no
romper el orden de headings según quién contenga la grilla.

### Chip de filtro — `catalogo/controles-filtro.tsx:39-70`

`<button aria-pressed>` con dos estados: activo `border-primary bg-primary
text-primary-foreground`, inactivo `border-border bg-background hover:bg-muted`.
Prop `tactil` que sube de `h-9` a `h-[46px]` para el drawer mobile.

### Chip de acorde — `tienda/chip-acorde.tsx`

`rounded-sm px-3 py-1.5 text-xs font-semibold` + color inline de
`colorDeChip()`.

### Badge del carrito — `tienda/badge-carrito.tsx`

Dos variantes: `chip` (barra desktop: bolsa + número en una caja con borde) y
`boton` (cuadrado de 46 px con el contador en un círculo `bg-primary`
flotando en la esquina). Es puramente informativo; `header.tsx` lo envuelve
en el `<button>` trigger del Sheet usando `className="contents"`.

### Panel vs drawer de filtros

Los controles (`controles-filtro.tsx`) son **los mismos** en desktop y
mobile; lo que cambia es el contenedor (`panel-filtros.tsx` caja con borde /
`drawer-filtros.tsx` `Sheet side="bottom"` con `rounded-t-xl` y
`max-h-[88vh]`) y la prop `tactil`. Todo el estado vive en la URL vía
`useQueryStates`, así que da igual desde cuál se toque.

El trigger mobile muestra el conteo: `Filtrar · N`, y se pinta como chip
activo cuando `N > 0`.

### Bloques de la ficha

`ficha-tecnica.tsx`, `barras-caracter.tsx` y cada nivel de `piramide.tsx`
comparten la misma caja: `rounded border bg-card p-[30px]` (o `p-6`), con
`h2` `text-xl font-bold tracking-[-0.015em]` arriba.

- **Ficha técnica**: `<dl>` de filas `justify-between` con `border-b` salvo
  la última; las filas sin dato **se saltean** en vez de mostrar "—".
- **Carácter**: 5 pasos por métrica, `bg-primary` los llenos y `bg-border`
  los vacíos, con caption en palabras ("corta"…"eterna"). Pie explícito:
  "Valores cargados por ParfamMdq a partir de la experiencia con el
  producto" — no son votos de la comunidad.
- **Pirámide**: encabezado nivel + línea `h-px flex-1 bg-border` + cuándo se
  siente; notas como chips `rounded border bg-background px-3 py-2`, sin
  color (el diccionario solo colorea acordes).

### Galería — `producto/galeria.tsx`

`Carousel` de shadcn/embla con `loop` si hay más de una foto, flechas solo en
desktop (`hidden lg:flex`), swipe en mobile, y hasta 4 miniaturas en
`grid-cols-4`. La activa se marca con `border-foreground ring-1 ring-foreground`.

### Selector de compra — `producto/comprar.tsx`

`RadioGroup` con cada opción dentro de un `<label>` completo clickeable:
`border-[1.5px]` siempre (solo cambia el color entre `border-foreground` y
`border-border`) — el grosor es constante a propósito para que la fila no se
corra medio píxel al seleccionarla. Stepper de cantidad con `Minus`/`Plus` en
una caja `rounded border bg-card`. Precio grande a la izquierda, stepper a la
derecha. Dos CTA apilados: primario negro "Agregar al carrito · {variante}" y
`variant="outline"` "Consultar por WhatsApp".

## A.8 Estados: carga, vacío, error

- **Carga**: `GrillaSkeleton` replica exactamente la altura de la tarjeta
  (foto 180/260 + 4 líneas) para que no salte el layout. Cada `Suspense`
  tiene su propio fallback dimensionado; el total del encabezado usa un
  `span animate-pulse` de ancho fijo (`seccion-catalogo.tsx:14`).
- **Vacío**: caja `rounded border border-dashed p-16 text-center
text-muted-foreground`. Dos textos según si hay filtros activos
  (`grilla.tsx:44-49`), y el mismo patrón en el checkout sin items.
- **Error de formulario**: `<p class="text-xs text-destructive">` debajo del
  campo, y el helper del teléfono se **reemplaza** por el error en vez de
  apilarse (`formulario-checkout.tsx:230-233`).
- **Aviso**: `Alert` de shadcn. Informativo con `ShieldCheck` ("No pedimos
  datos de pago"), y `variant="destructive"` para el cambio de precios.
- **Confirmación**: `toast.success` de sonner con descripción
  `producto · variante · N unidades`.

## A.9 Responsive y modo oscuro

No hay breakpoints custom: `sm` 640 / `lg` 1024 de Tailwind. El corte
principal es **`lg`**: header, footer y filtros tienen dos bloques separados
(`hidden lg:flex` / `lg:hidden`) en vez de un solo árbol adaptativo. `sm` se
usa dentro de la tarjeta para densificar.

Modo oscuro: existe completo en `globals.css` y **solo sigue la preferencia
del sistema**; no hay toggle ni se planea (`theme-provider.tsx`). El
`suppressHydrationWarning` va únicamente en `<html>`
(`src/app/layout.tsx:44`).

## A.10 Tono de voz

**es-AR, voseo, segunda persona, frases cortas.** `lang="es-AR"` en el
`<html>`. Los textos de cara al usuario llevan tildes y signos de apertura.

Muestras del código:

- `"Recorré el catálogo y elegí entre frasco entero, tester o decant, en el tamaño que quieras probar."` (`como-comprar`)
- `"Sumá una o varias fragancias. Podés seguir mirando el catálogo antes de cerrar el pedido."` (`como-comprar`)
- `"Te pedimos nombre y teléfono, y se abre el chat con el pedido ya escrito."` (`resumen-carrito.tsx:49-52`)
- `"¿A nombre de quién armamos el pedido?"` (h1 del checkout)
- `"Con esto generamos el pedido y abrimos WhatsApp con todo escrito. El resto — envío o retiro, y cómo pagás — lo arreglás por chat."`
- `"Por si se corta el chat y tenemos que escribirte."` (helper del teléfono)
- `"No hay fragancias con esos filtros. Probá limpiando alguno."` (vacío)
- `"Consultá el precio"` (tarjeta sin precio)
- `"¡Hola! Quería consultar por el {nombre} de {marca} ({variante})."` (mensaje prellenado)

Reglas que se leen del corpus:

1. **Nosotros/vos**, nunca impersonal: "armamos", "te pedimos", "escribinos".
2. **Imperativo voseante** en microcopy de acción: "Recorré", "Sumá",
   "Elegí", "Consultá", "Probá".
3. **Se nombra la limitación en vez de esconderla**: "No pedimos datos de
   pago", "El pedido se cierra por WhatsApp".
4. **Sin jerga de e-commerce**: no hay "añadir al cesto", "SKU", "finalizar
   compra"; es "Agregar al carrito", "pedido", "Finalizar pedido por
   WhatsApp".
5. Emojis: cero. Signos de apertura `¿` `¡`: siempre.

El código, identificadores y comentarios van en castellano sin tildes o en
inglés; los comentarios son autoexplicativos y densos (ver
`src/lib/color.ts`, `buscador.tsx`) — es una convención marcada del repo.

## A.11 Patrón de interacción del checkout por WhatsApp

El sitio **no cobra**. Todo el sistema de diseño está construido alrededor de
ese hecho, y se ve en cuatro decisiones visuales concretas:

**1. El verde solo aparece en la salida hacia WhatsApp.** En una paleta
crema/negra, `--whatsapp` es la única señal cromática de acción. Marca el
borde del sistema: a partir de ese botón, la conversación sale de la web.
Los otros CTA (agregar al carrito, aplicar filtros) son negros.

**2. Dos intensidades de contacto, visualmente jerarquizadas.**
"Consultar por WhatsApp" en la ficha es `variant="outline"` (secundario, no
compromete); "Finalizar pedido por WhatsApp" y "Enviar pedido por WhatsApp"
son verdes sólidos y a ancho completo. Ambos con `MessageCircle` a la
izquierda.

**3. El checkout pide dos campos y lo dice.** `nombre` + `telefono` con
prefijo fijo `+54 9` en un `<span>` con `bg-muted` pegado al input dentro de
un contenedor `rounded-lg border border-input overflow-hidden`
(`formulario-checkout.tsx:215-235`). El `Alert` con `ShieldCheck` arriba
declara "No pedimos datos de pago". El honeypot se posiciona fuera de
pantalla (`absolute -left-[9999px]`), no con `hidden`.

**4. El botón narra el estado en tres textos.** `"Verificando tu carrito…"`
→ `"Armando el pedido…"` (con `Loader2 animate-spin`) →
`"Enviar pedido por WhatsApp"`. Y está deshabilitado mientras la
reconciliación de precios contra la base no termina.

**Mecánica que condiciona la UI**: el `window.open("", "_blank")` se dispara
**sincrónico con el click**, antes del `await` de la Server Action, porque si
no Safari y Chrome bloquean el popup; recién cuando vuelve el resultado se le
asigna `location.href` (`formulario-checkout.tsx:80-84`). Si el formulario es
inválido o la acción falla, el popup se cierra. Después se navega a
`/pedido/{numero}/gracias?link=…`, y esa página **valida** que el `link`
recibido sea `https://wa.me/…` antes de usarlo como `href`
(`src/lib/whatsapp.ts:31-38`).

El mensaje se arma desde una plantilla editable
(`SiteSetting.whatsappMessageTemplate`) con placeholders `{{marca}}`,
`{{items}}`, `{{total}}`, `{{nombre}}`, `{{numero}}`; cada ítem es
`• Marca Producto — Variante xN — $precio`
(`src/lib/tienda/mensaje-pedido.ts`).

## A.12 Accesibilidad que ya está resuelta

Vale enumerarlo porque marca el piso del proyecto:

- **Contraste de chips de acorde garantizado por código** (`src/lib/color.ts`,
  4,5:1 con corrección de fondo).
- **Contraste del CTA de WhatsApp calculado a mano** y documentado en
  `globals.css:78-88`.
- **Orden de headings parametrizado**: `nivel` en la tarjeta y `nivelTitulo`
  en la sección de catálogo, con el comentario que explica que `axe` marca
  "heading order invalid" si no.
- `SheetTitle` en `sr-only` cuando el diseño no muestra encabezado
  (`header.tsx:143-146`).
- `<label class="sr-only">` en el buscador; `aria-label` en todos los
  `SelectTrigger`.
- `aria-pressed` en los chips de filtro; `aria-current` en las miniaturas de
  la galería y en la paginación.
- `role="img"` + `aria-label="Duración: 4 de 5"` en las barras de carácter.
- Paginación con `<a href>` reales (Server Component), no botones de cliente;
  `aria-disabled` + `tabIndex={-1}` en los extremos.
- `aria-hidden` en los SVG decorativos del placeholder de frasco.
- Menú de navegación mobile con `min-h-11` (44 px) por item.

---

# Parte B — Mejoras y arreglos propuestos

Nada de esta sección está implementado. Cada ítem lleva problema, paths,
corrección propuesta y etiqueta de esfuerzo/riesgo. Ninguna propuesta agrega
dependencias ni cambia el stack.

## Tabla resumen rankeada

| #    | Ítem                                                                   | Tipo         | Esfuerzo | Riesgo |
| ---- | ---------------------------------------------------------------------- | ------------ | -------- | ------ |
| B-01 | `--destructive` a 4,12:1 en claro: errores de formulario bajo AA       | A11y         | S        | Bajo   |
| B-02 | Bordes de control a 1,26:1: falla 1.4.11 de contraste no textual       | A11y         | M        | Medio  |
| B-03 | Foco visible sin diseñar en todo el storefront menos un componente     | A11y         | M        | Bajo   |
| B-04 | Targets táctiles por debajo de 44 px en controles de compra            | A11y         | S        | Bajo   |
| B-05 | Navegación sin `aria-current` y con afordancia invertida               | A11y + UX    | S        | Bajo   |
| B-06 | `role="status"` anidado dentro del botón del carrito                   | A11y         | S        | Bajo   |
| B-07 | 20 comentarios apuntan a `design/*.dc.html` y `brand/`, que no existen | Higiene      | S        | Nulo   |
| B-08 | Escala tipográfica y de espaciado ad hoc (15 tamaños, 17 trackings)    | Consistencia | L        | Medio  |
| B-09 | Cuatro radios casi idénticos y dos formas de escribir el mismo         | Consistencia | S        | Bajo   |
| B-10 | El logotipo ignora `SiteSetting.brandName` y le falta una tilde        | Marca        | S        | Bajo   |

Esfuerzo: **S** ≤ 1 archivo o cambio mecánico · **M** varios archivos,
criterio acotado · **L** requiere decisión de diseño previa.

---

## B-01 · Contraste de `--destructive` por debajo de AA en claro

**Problema.** `--destructive: oklch(0.577 0.245 27.325)` (`#E7000B`) da
**4,12:1** contra `--background` y **4,49:1** contra `--card`. WCAG AA pide
4,5:1 para texto normal. El uso más expuesto es el mensaje de error del
formulario de checkout, que además es `text-xs` (12 px, no califica como
texto grande). El modo oscuro está bien (6,46:1 sobre `--background`).

**Dónde se ve.**

- Token: `src/app/globals.css:72`
- `src/app/(tienda)/checkout/_components/formulario-checkout.tsx:194-198` (`text-xs text-destructive`)
- Mismo patrón en los formularios de `src/app/admin/(panel)/`

**Corrección propuesta.** Oscurecer únicamente el valor de `:root` hasta
≥4,5:1 contra `--card` (la superficie más clara donde aparece), dejando
`.dark` como está. Un `oklch(~0.52 0.21 27.3)` entra cómodo sin cambiar el
hue. Verificar con el mismo criterio que ya usa `src/lib/color.ts`.

**Esfuerzo/Riesgo.** S / Bajo — una línea de CSS; el riesgo es solo estético
(rojo un punto más oscuro en botones destructivos del panel).

---

## B-02 · Bordes de control a 1,26:1 (WCAG 1.4.11)

**Problema.** `--border` y `--input` comparten el mismo valor (`#DCD5CA`),
que da **1,26:1** contra `--background` y **1,37:1** contra `--card`. Eso
está bien para un separador decorativo, pero el criterio 1.4.11 (Non-text
Contrast, AA) pide **3:1** cuando el borde es el único indicador de que algo
es un control. En este diseño casi todo lo es: inputs, select triggers, chips
de filtro inactivos, el stepper de cantidad, las opciones de variante no
seleccionadas y las miniaturas de la galería se distinguen **solo** por el
borde. En oscuro es peor todavía: 1,52:1 / 1,38:1.

**Dónde se ve.**

- Tokens: `src/app/globals.css:89-90` y `132-133`
- `src/components/ui/input.tsx` (`border-input`), `src/components/ui/select.tsx` (`border-input`)
- `src/components/tienda/catalogo/controles-filtro.tsx:62` (chip inactivo)
- `src/components/tienda/producto/comprar.tsx:159-162` (variante no elegida)
- `src/components/tienda/producto/galeria.tsx:88-92` (miniatura inactiva)

**Corrección propuesta.** Separar el token decorativo del funcional:
mantener `--border` para separadores y bordes de tarjeta, y llevar `--input`
(usado por controles) a un valor con ≥3:1 contra `--background` y `--card`
en ambos modos. Los componentes de tienda que hoy escriben `border-border`
sobre controles (`buscador.tsx:76`, `badge-carrito.tsx`, `select-orden`
vía `className`) pasarían a `border-input`.

**Esfuerzo/Riesgo.** M / Medio — el cambio de token es trivial, pero hay que
auditar cada `border-border` para decidir si es control o decoración. Cambia
el peso visual del catálogo, que es la pantalla más vista: conviene revisarlo
en las dos pantallas grandes antes de aceptarlo.

---

## B-03 · Foco visible sin diseñar fuera de un único componente

**Problema.** En todo el storefront hay **un solo** componente que declara
estilos de foco: `tarjeta-producto.tsx` (`focus-visible:ring-2
focus-visible:ring-ring focus-visible:outline-none`). Los primitivos de
shadcn traen su propio patrón (`focus-visible:border-ring
focus-visible:ring-3 focus-visible:ring-ring/50`). Todos los controles custom
del medio —chips de filtro, trigger "Filtrar · N", botón "Ver N fragancias",
"Limpiar", stepper de cantidad, miniaturas de galería, links del header y del
footer, los dos triggers del carrito— no declaran nada y caen al anillo por
defecto del navegador, que no respeta el `outline-ring/50` del `@layer base`
(Chrome dibuja su ring `auto` ignorando `outline-color`). Resultado: tres
apariencias de foco distintas según qué elemento se tabule.

**Dónde se ve.**

- `src/app/globals.css:146-149` (`* { @apply border-border outline-ring/50 }`)
- `src/components/tienda/catalogo/controles-filtro.tsx:53-68` y `260-270`
- `src/components/tienda/catalogo/drawer-filtros.tsx:59-70` y `126-134`
- `src/components/tienda/producto/comprar.tsx:200-222` (stepper)
- `src/components/tienda/producto/galeria.tsx:78-95` (miniaturas)
- `src/components/tienda/header.tsx:36-37` (`CUADRADO`), `footer.tsx`

**Corrección propuesta.** Definir una sola cadena de foco —la misma que ya
usan los primitivos: `focus-visible:border-ring focus-visible:ring-3
focus-visible:ring-ring/50 outline-none`— y aplicarla a los controles
custom. Como es la misma cadena repetida, el lugar natural es una constante
exportada junto a `cn` o, si se prefiere no tocar `src/lib/`, una clase
declarada en `@layer components` de `globals.css`. `--ring` ya da 4,99:1
contra el fondo claro, así que el token no necesita cambiar.

**Esfuerzo/Riesgo.** M / Bajo — sin efecto en el render normal, solo aparece
al tabular. Conviene hacerlo después de B-02 para no elegir el grosor dos
veces.

---

## B-04 · Targets táctiles por debajo de 44 px en controles de compra

**Problema.** El stepper de cantidad de la ficha es `p-3` alrededor de un
icono `size-4`: **40 × 40 px** reales, en mobile, en la pantalla donde se
decide la compra. Los chips de filtro en su variante no táctil miden `h-9`
(36 px) — hoy solo aparecen en el panel desktop, pero la prop `tactil` es
opt-in, así que cualquier uso nuevo en mobile hereda los 36 px por omisión.
`LimpiarFiltros variante="enlace"` es texto subrayado de 13 px sin área
propia. WCAG 2.2 pide 24 × 24 px como mínimo AA, pero la guía de plataforma
(44 pt iOS / 48 dp Android) es la referencia correcta para una tienda que se
usa del teléfono.

**Dónde se ve.**

- `src/components/tienda/producto/comprar.tsx:200-222`
- `src/components/tienda/catalogo/controles-filtro.tsx:56-59` (default `h-9`)
- `src/components/tienda/catalogo/controles-filtro.tsx:264-268`

**Corrección propuesta.** Llevar los dos botones del stepper a `size-11`
(44 px) manteniendo el icono en `size-4`; invertir el default de `tactil`
para que el tamaño chico sea el opt-in (`compacto`), de modo que el valor por
omisión sea accesible; y darle a `LimpiarFiltros variante="enlace"` un
`min-h-11` con padding en lugar de ser texto suelto.

**Esfuerzo/Riesgo.** S / Bajo — el stepper es autocontenido. Invertir el
default de `tactil` toca los 4 call-sites del panel desktop, que habría que
pasar a `compacto`.

---

## B-05 · Navegación sin `aria-current` y con afordancia invertida

**Problema.** Dos cosas en el mismo lugar. (a) El link de la ruta activa se
pinta `text-muted-foreground` y el inactivo `text-foreground`: el ítem activo
se ve **menos** prominente que los demás, y encima coincide exactamente con
el color del `hover` del inactivo, así que pasar el mouse por cualquier link
lo vuelve indistinguible del activo. (b) No hay `aria-current="page"` en
ningún link de navegación, ni en el header desktop, ni en el Sheet mobile, ni
en el footer — un lector de pantalla no tiene forma de saber dónde está.

**Dónde se ve.**

- `src/components/tienda/header.tsx:55-61` (`claseLink`)
- `src/components/tienda/header.tsx:152-160` (nav del Sheet, mismo criterio)

**Corrección propuesta.** Agregar `aria-current={pathname === item.href ?
"page" : undefined}` en los dos navs, y diferenciar el estado activo por algo
que no compita con el hover: peso (`font-semibold`) o un subrayado
(`underline underline-offset-4`), manteniendo `text-foreground`. El proyecto
ya usa `underline-offset` en `LimpiarFiltros` y en el link de tester, así que
no introduce un recurso nuevo.

**Esfuerzo/Riesgo.** S / Bajo — un archivo, cambio visible pero acotado a la
barra.

---

## B-06 · `role="status"` anidado dentro del botón del carrito

**Problema.** `BadgeCarrito` se renderiza como `<span role="status"
aria-label="Carrito: 3 unidades">` y `header.tsx` lo envuelve en un
`<button aria-label="Abrir el carrito" class="contents">`. Quedan tres
problemas encadenados: una live region dentro de un control interactivo (el
lector puede anunciarla en cada cambio sin contexto de que es un botón); el
nombre accesible del botón es solo "Abrir el carrito", así que la cantidad
—que sí está en el `aria-label` del span— **no llega** al usuario al
enfocarlo; y el número visible lleva `aria-hidden="true"`, con lo cual el
único portador del dato es el `aria-label` que queda tapado. Además
`class="contents"` en el botón lo saca del árbol de layout, lo que complica
darle un target y un anillo de foco propios (ver B-03 y B-04).

**Dónde se ve.**

- `src/components/tienda/badge-carrito.tsx:34-40` y `57-64`
- `src/components/tienda/header.tsx:76-84` y `102-110`

**Corrección propuesta.** Dejar el badge como puramente visual
(`aria-hidden`), poner el nombre completo en el botón
(`aria-label={`Abrir el carrito, ${etiqueta}`}`) y, si se quiere conservar el
anuncio automático al agregar productos, montar un único `<span role="status"
class="sr-only">` hermano del botón en el header en vez de dentro de él. El
`class="contents"` puede pasar a las clases del cuadrado/chip para que el
botón sea el elemento real.

**Esfuerzo/Riesgo.** S / Bajo — dos archivos, sin cambio visual.

---

## B-07 · Comentarios que apuntan a archivos inexistentes

**Problema.** Veinte comentarios del storefront referencian
`design/Main.dc.html`, `design/HomeMobile.dc.html`, `design/Producto.dc.html`,
`design/Carrito.dc.html`, `design/Checkout.dc.html`,
`design/AdminProductos.dc.html` y "las piezas de marca en `brand/`". **Ninguno
de los dos directorios existe en el repo.** `AGENTS.md` es explícito: "Si
hace falta una referencia, que sea a un archivo que existe en el repo". Hoy
esos comentarios no se pueden verificar y le dan al lector la falsa
impresión de que hay una fuente de verdad visual consultable.

**Dónde se ve.** `globals.css:54` (brand/), `globals.css:70` y `79`
(design/…); `tienda/header.tsx:33-34`, `footer.tsx:16`, `hero.tsx:6-7`,
`tarjeta-producto.tsx:7`, `badge-carrito.tsx:13-15`, `carrito-drawer.tsx:9`,
`carrito/item-fila.tsx:63`, `carrito/lista-items.tsx:11`,
`carrito/resumen-carrito.tsx:10`, `catalogo/grilla.tsx:18`,
`catalogo/panel-filtros.tsx:33`, `catalogo/drawer-filtros.tsx:32`,
`catalogo/seccion-catalogo.tsx:17`, `producto/galeria.tsx:17`,
`producto/piramide.tsx:20`, `producto/ficha-tecnica.tsx:24`,
`producto/barras-caracter.tsx:53`, `frasco-placeholder.tsx:5`,
`checkout/_components/formulario-checkout.tsx:24` y `31`.

**Corrección propuesta.** Dos opciones excluyentes: (a) versionar los
mockups bajo `design/` y `brand/` y dejar los comentarios como están, o (b)
reemplazar cada referencia por una descripción autocontenida del criterio
(que es lo que los comentarios ya hacen bien en el resto de los casos) y
apuntar, donde corresponda, a este documento. Elegir una; hoy no está
ninguna.

**Esfuerzo/Riesgo.** S / Nulo — solo comentarios, cero cambio funcional. Es
el ítem con mejor relación valor/riesgo de la lista.

---

## B-08 · Escala tipográfica y de espaciado ad hoc

**Problema.** El diseño está transcripto píxel a píxel desde los mockups, y
eso quedó en el código como valores arbitrarios: **15 tamaños de fuente en
px** (`text-[7px]`, `[9px]`, `[10px]`, `[11px]`, `[13px]`, `[15px]`, `[17px]`,
`[21px]`, `[22px]`, `[32px]`, `[38px]`, `[44px]`, `[46px]`, `[52px]`,
`[132px]`), **17 valores de `tracking` arbitrarios**, y **10 espaciados en px**
(`p-[30px]`, `p-[22px_24px]`, `gap-[72px]`, `gap-[11px]`, `px-[18px]`,
`py-[22px]`…). Hay pares que difieren en 1-2 px sin motivo semántico
(`text-[9px]` y `text-[10px]` para el mismo eyebrow en dos breakpoints;
`tracking-[0.14em]`, `[0.16em]` y `[0.18em]` para el mismo rol). Además
`max-w-[1440px]` está copiado en 8 archivos y `px-5 lg:px-16` en 12. Cambiar
el ancho del sitio hoy requiere editar 8 archivos.

**Dónde se ve.** Transversal; los concentradores son
`src/components/tienda/logotipo.tsx`, `tarjeta-producto.tsx`,
`catalogo/seccion-catalogo.tsx`, `catalogo/drawer-filtros.tsx`,
`producto/comprar.tsx` y
`src/app/(tienda)/checkout/_components/formulario-checkout.tsx`.

**Corrección propuesta.** Dos movimientos independientes, el primero mucho
más barato que el segundo:

1. **Contenedor.** Un componente `Contenedor` (o una clase en
   `@layer components`) que encapsule `mx-auto max-w-[1440px] px-5 lg:px-16`,
   y reemplazarlo en los 8 archivos. Mecánico y verificable.
2. **Tokens tipográficos.** Declarar en `@theme` los tamaños y trackings que
   el diseño realmente usa, con nombre semántico
   (`--text-eyebrow`, `--tracking-eyebrow`, `--text-display`,
   `--tracking-display`, `--text-precio-*`), consolidando los pares que hoy
   difieren en 1 px. Eso exige decidir **cuáles** se unifican: es una
   decisión de diseño, no una refactorización.

**Esfuerzo/Riesgo.** L / Medio — el punto 1 es S/Bajo y se puede hacer solo.
El punto 2 toca casi todas las pantallas y no entra en "sin cambios de
comportamiento" si se consolidan valores; dejarlo para después del refactor.

---

## B-09 · Cuatro radios casi idénticos y dos formas de escribir el mismo

**Problema.** Conviven: `rounded` (= `var(--radius)` = 4 px), `rounded-lg`
(= el mismo valor, usado por los primitivos de shadcn), `rounded-sm`
(= `calc(var(--radius) * 0.6)` = 2,4 px), `rounded-[3px]` y `rounded-[2px]`.
Los tres últimos son indistinguibles a simple vista y se usan para el mismo
tipo de elemento: `rounded-sm` en el chip de acorde y la miniatura del
carrito, `rounded-[3px]` en el badge de etiqueta y los chips de tamaño de la
tarjeta, `rounded-[2px]` en los pasos de las barras de carácter. Y como
`rounded` y `rounded-lg` son el mismo valor, el lector no puede deducir del
nombre de la clase si algo es "el radio del sistema" o "un radio chico".

**Dónde se ve.**

- `src/app/globals.css:44-50` (escala) y `:96` (`--radius`)
- `src/components/tienda/tarjeta-producto.tsx:38` y `:76` (`rounded-[3px]`)
- `src/components/tienda/producto/barras-caracter.tsx:44` (`rounded-[2px]`)
- `src/components/tienda/chip-acorde.tsx:27`, `carrito/item-fila.tsx:18` y `:32` (`rounded-sm`)
- `src/components/ui/*.tsx` (`rounded-lg` en todos los primitivos)

**Corrección propuesta.** Unificar `rounded-[3px]` y `rounded-[2px]` en
`rounded-sm` (diferencia visual nula a esos tamaños) y elegir una sola forma
de escribir el radio base: `rounded-lg` si se quiere quedar alineado con
shadcn, o `rounded` si se prefiere la forma corta — pero una sola, y dejarla
anotada acá. No tocar `--radius` ni la escala.

**Esfuerzo/Riesgo.** S / Bajo — reemplazo mecánico; la diferencia máxima que
introduce es de 1 px de radio en elementos de 20 px de alto.

---

## B-10 · El logotipo ignora `SiteSetting.brandName`, y le falta una tilde

**Problema.** Dos defectos chicos en la pieza más visible de la marca.
(a) `Logotipo` renderiza `siteDefaults.name` —la constante hardcodeada de
`src/lib/site.ts`— mientras que `SiteSetting.brandName` es editable desde
`/admin/configuracion` y sí se usa en el `<title>` de todas las páginas
(`src/app/layout.tsx:30`) y en el mensaje de WhatsApp. Si el admin cambia el
nombre de la marca, el `<title>` y el chat dicen una cosa y el logotipo del
header, el hero y el footer dicen otra. El mismo componente convive con un
`Hero` que **sí** lee `config.brandTagline` de la base, lo que hace la
inconsistencia más llamativa. (b) El subtítulo del logotipo dice
`"Perfumeria"` sin tilde y la imagen OG dice `"PERFUMERIA"`; `AGENTS.md`
pide tildes en todo texto de cara al usuario, y `siteDefaults.legalName` ya
escribe `"ParfamMdq Perfumeria"` también sin tilde.

**Dónde se ve.**

- `src/components/tienda/logotipo.tsx:34` y `:45`
- `src/components/tienda/footer.tsx:78-80` (versión mobile, `siteDefaults.name` inline sin usar `Logotipo`)
- `src/app/(tienda)/opengraph-image.tsx:70`
- `src/lib/site.ts:11` (`legalName`)

**Corrección propuesta.** (a) Decidir explícitamente y documentarlo: o el
logotipo es tipografía fija de marca —y entonces `brandName` no debería ser
editable, o debería estar documentado que solo afecta metadatos— o el
logotipo recibe el nombre por prop desde los Server Components que ya llaman
a `obtenerConfiguracionSitio()` (header es Client, así que tendría que
bajar como prop desde el layout). **Es una decisión de producto, no
técnica.** (b) Poner la tilde en `"Perfumería"` / `"PERFUMERÍA"` y en
`legalName`; de paso, el footer mobile puede usar `<Logotipo tamanio="barra">`
en vez de repetir el markup.

**Esfuerzo/Riesgo.** S / Bajo para la tilde y el footer. La parte (a)
necesita que alguien decida antes de tocar nada.

---

## Apéndice: hallazgos menores

No entran en el top 10 pero conviene tenerlos anotados.

- **`--muted-foreground` sobre `--muted` da 4,48:1** — justo debajo de AA.
  Se materializa en `LimpiarFiltros variante="boton"`
  (`controles-filtro.tsx:268`: `text-muted-foreground hover:bg-muted`) y en
  cualquier `hover:bg-muted` con texto tenue. Se resuelve solo si se toca
  `--muted-foreground` por B-01/B-02.
- **`--chart-1..5` no se usan en ningún lado** (grep sin resultados en
  `src/`). Son 10 declaraciones muertas en `globals.css`. Borrarlas es
  gratis; dejarlas también, si se prevé un dashboard en el panel.
- **La silueta de frasco está duplicada tres veces**:
  `src/components/frasco-placeholder.tsx`, el `Miniatura` interno de
  `src/components/tienda/carrito/item-fila.tsx:16-58`, y el equivalente en
  `src/app/admin/(panel)/productos/_components/tabla-productos.tsx`. Mismos
  `viewBox` y mismos `rect`, con rellenos distintos. Un solo componente con
  prop de tamaño cubriría los tres.
- **`--font-heading` apunta a `--font-sans`** (`globals.css:11`): es un alias
  sin efecto. O se le da una familia propia o se saca, para que nadie lo lea
  como un punto de extensión real.
- **No hay toggle de tema**, y está documentado como decisión
  (`theme-provider.tsx`). Si alguna vez se agrega, el `Logotipo` y el
  `FrascoPlaceholder` ya son token-only y no necesitan cambios; lo que sí
  habría que revisar es `src/lib/color.ts`, que compara contra `#14120F` y
  `#F2EEE9` fijos.
- **`Alert` informativo usa `AlertTitle` con `text-muted-foreground`**
  (`formulario-checkout.tsx:158-161`): un título con estilo de texto
  secundario. Funciona, pero es el único `AlertTitle` del sitio que no se ve
  como título.

## Mediciones de contraste (reproducibles)

Calculadas convirtiendo los OKLCH de `globals.css` a sRGB y aplicando la
fórmula de luminancia relativa de WCAG — la misma que implementa
`src/lib/color.ts`.

### Modo claro

| Par                                | Ratio   | AA texto normal           |
| ---------------------------------- | ------- | ------------------------- |
| `foreground` / `background`        | 18,18:1 | ✅                        |
| `foreground` / `card`              | 19,81:1 | ✅                        |
| `muted-foreground` / `background`  | 4,99:1  | ✅                        |
| `muted-foreground` / `card`        | 5,44:1  | ✅                        |
| `muted-foreground` / `muted`       | 4,48:1  | ⚠️ al límite              |
| `whatsapp-foreground` / `whatsapp` | 4,53:1  | ✅ (por diseño)           |
| `success-foreground` / `success`   | 6,53:1  | ✅                        |
| `destructive` / `background`       | 4,12:1  | ❌ B-01                   |
| `destructive` / `card`             | 4,49:1  | ❌ B-01                   |
| `ring` / `background`              | 4,99:1  | ✅ (foco necesita 3:1)    |
| `border` / `background`            | 1,26:1  | ❌ B-02 (1.4.11 pide 3:1) |
| `border` / `card`                  | 1,37:1  | ❌ B-02                   |

### Modo oscuro

| Par                               | Ratio   | AA texto normal |
| --------------------------------- | ------- | --------------- |
| `foreground` / `background`       | 16,19:1 | ✅              |
| `muted-foreground` / `background` | 6,80:1  | ✅              |
| `muted-foreground` / `card`       | 6,17:1  | ✅              |
| `muted-foreground` / `muted`      | 5,47:1  | ✅              |
| `destructive` / `background`      | 6,46:1  | ✅              |
| `destructive` / `card`            | 5,87:1  | ✅              |
| `success-foreground` / `success`  | 7,11:1  | ✅              |
| `border` / `background`           | 1,52:1  | ❌ B-02         |
| `border` / `card`                 | 1,38:1  | ❌ B-02         |
| `sidebar-foreground` / `sidebar`  | 12,10:1 | ✅              |
