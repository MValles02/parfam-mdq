# Design System — Parfam MDQ

This is a **reference document, not a specification**. It describes the visual identity that **already exists in code** (Part A) and suggests improvements without implementing them (Part B). The active refactor must not change behavior, so nothing in this document authorizes a redesign.

When this document conflicts with the code, **the code wins**, as it does for `docs/` under `AGENTS.md`. Every Part A claim includes its source path.

Extracted: 2026-09-20 · branch `refactor/cleanup` · commit `53f5c93`.

---

## Contents

- [Part A — Existing system](#part-a--existing-system)
  - [A.1 Visual stack and configuration](#a1-visual-stack-and-configuration)
  - [A.2 Color palette and tokens](#a2-color-palette-and-tokens)
  - [A.3 Typography](#a3-typography)
  - [A.4 Radii](#a4-radii)
  - [A.5 Spacing, grid, and containers](#a5-spacing-grid-and-containers)
  - [A.6 Icons and images](#a6-icons-and-images)
  - [A.7 Existing component patterns](#a7-existing-component-patterns)
  - [A.8 Loading, empty, and error states](#a8-loading-empty-and-error-states)
  - [A.9 Responsive behavior](#a9-responsive-behavior)
  - [A.10 Voice and tone](#a10-voice-and-tone)
  - [A.11 WhatsApp checkout interaction](#a11-whatsapp-checkout-interaction)
  - [A.12 Existing accessibility](#a12-existing-accessibility)
- [Part B — Proposed improvements](#part-b--proposed-improvements)
  - [Ranked summary](#ranked-summary)
  - [B-01 through B-10](#b-01--light-mode-destructive-contrast-is-below-aa)
  - [Appendix: minor findings](#appendix-minor-findings)
  - [Reproducible contrast measurements](#reproducible-contrast-measurements)

---

# Part A — Existing system

## A.1 Visual stack and configuration

| Element       | Actual value                                                                                                                                  | Source                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| shadcn preset | `radix-nova`, `baseColor: neutral`, `cssVariables: true`, no prefix                                                                           | `components.json`            |
| Icons         | Lucide (`iconLibrary: "lucide"`)                                                                                                              | `components.json`            |
| Root CSS      | `@import "tailwindcss"`, `tw-animate-css`, and `shadcn/tailwind.css`                                                                          | `src/app/globals.css:1-3`    |
| Dark variant  | `@custom-variant dark (&:is(.dark *))`; retained to neutralize `dark:` utilities instead of compiling them as a system-preference media query | `src/app/globals.css:9`      |
| Toasts        | `sonner` with `position="top-right" richColors`                                                                                               | `src/app/(store)/layout.tsx` |
| Filter state  | `nuqs`; `NuqsAdapter` is in the store layout                                                                                                  | `src/app/(store)/layout.tsx` |

The `@theme inline` layer in `globals.css:7-51` exposes each `:root` variable as a Tailwind token. That is why utilities such as `bg-whatsapp` and `text-success-foreground` work without additional registration.

## A.2 Color palette and tokens

The identity declared at `src/app/globals.css:53-55` is **`#F2EEE9` cream on black ink**. Values use OKLCH and include reference hexadecimal comments.

### Light mode (`:root`, `globals.css:53-107`)

| Token                                  | OKLCH                 | Hex       | Observed role                                                             |
| -------------------------------------- | --------------------- | --------- | ------------------------------------------------------------------------- |
| `--background`                         | `0.9508 0.008 73.74`  | `#F2EEE9` | Page background and product-card photo surface                            |
| `--foreground`                         | `0 0 0`               | `#000000` | Main text and hero `<h1>`                                                 |
| `--card`                               | `0.9798 0.0045 78.3`  | `#FAF8F5` | Elevated surfaces: cards, filter panels, technical details, summaries     |
| `--popover`                            | same as `--card`      | `#FAF8F5` | Select, dropdown, tooltip                                                 |
| `--primary`                            | `0 0 0`               | `#000000` | Solid CTAs, active filter chips, label badges, filled characteristic bars |
| `--primary-foreground`                 | `0.9508 0.008 73.74`  | `#F2EEE9` | Text on primary                                                           |
| `--secondary` / `--muted` / `--accent` | `0.915 0.0138 78.26`  | `#E8E2D9` | Subtle fills, chip hover, bottle placeholder fill                         |
| `--muted-foreground`                   | `0.5095 0.0158 78.18` | `#6B655C` | Secondary text, uppercase eyebrows, metadata                              |
| `--destructive`                        | `0.577 0.245 27.325`  | `#E7000B` | Form errors and panel destructive actions                                 |
| `--border` / `--input`                 | `0.8756 0.0168 79.34` | `#DCD5CA` | Card borders, dividers, input borders                                     |
| `--ring`                               | `0.5095 0.0158 78.18` | `#6B655C` | Focus ring                                                                |
| `--radius`                             | —                     | `0.25rem` | See A.4                                                                   |

### Custom tokens outside the shadcn preset

`--success`, `--success-foreground`, and `--success-border` (`globals.css:73-77`) form a subdued success label for “publicado” and “confirmado”. This is the palette's only muted green, kept separate from accord chips.

| Token                  | Value     |
| ---------------------- | --------- |
| `--success`            | `#DFECDF` |
| `--success-foreground` | `#305A38` |
| `--success-border`     | `#B9D2BC` |

It is currently used only in the panel: `order-status-chip.tsx`, `action-row.tsx`, and `reference-step.tsx`.

`--whatsapp` and `--whatsapp-foreground` are defined in `globals.css:78-88`.

| Token                   | Value                                    |
| ----------------------- | ---------------------------------------- |
| `--whatsapp`            | `oklch(0.5175 0.137 149.95)` = `#107D3A` |
| `--whatsapp-foreground` | `oklch(0.9508 0.008 73.74)` = `#F2EEE9`  |

The source comment explains why the design does not use mockup green `#1DA851`: it reaches only 2.68:1 against cream. `#107D3A` reaches **4.53:1** and is always applied to a solid button, so its contrast is local to that button. Current callers are `cart-summary.tsx`, `checkout-form.tsx`, `_customer-thanks.tsx`, and the admin order detail page.

### Panel sidebar and charts

`globals.css:97-106` reverses the palette in the administration sidebar: `#14120F` ink with `#D6CFC5` text. It reads as an internal tool while staying within the brand. `--chart-1` through `--chart-5` were removed because no source code used them.

### Color that deliberately is not a token

`src/components/store/accord-chip.tsx` and `src/lib/color.ts` use the database value `Accord.color` from `data/dictionaries/accords.es.json`. Accord color is domain data, not theme choice, so it is inline. `getChipColor()` selects `#14120F` or `#F2EEE9` based on the stronger contrast and, when neither meets 4.5:1, shifts the background toward the opposite extreme in 2% increments. The current dictionary needs at most 8%. The colored dot in the olfactory family filter uses the same justified inline treatment.

## A.3 Typography

**Outfit is the only family.** There is no type pairing.

| Location               | Loading method                                                                                                                | Source                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Entire site            | `next/font/google` `Outfit`, `variable: "--font-sans"`, `subsets: ["latin"]`, no fixed `weight` because it is a variable font | `src/app/layout.tsx:6-9`                                  |
| Tailwind tokens        | `--font-sans` and `--font-heading` both reference `--font-sans` in `@theme inline`                                            | `src/app/globals.css:10-11`                               |
| Application            | `html { @apply font-sans }` in `@layer base`                                                                                  | `src/app/globals.css:150-152`                             |
| Favicon and Open Graph | `src/assets/fonts/Outfit-ExtraBold.ttf` (800; OFL beside the file) is read with `readFile`                                    | `src/app/icon.tsx`, `src/app/(store)/opengraph-image.tsx` |

The local `.ttf` exists only because `ImageResponse` cannot use `next/font`; the browser does not download it. `--font-heading` currently adds no visual distinction.

Observed usage: `font-bold` 62, `font-semibold` 48, `font-medium` 45, `font-extrabold` 25, `font-normal` 1, and `font-light` 1. The latter is the italic hero tagline.

### The three type registers

1. **Display / logo.** `Logo` is text, not SVG: extra-bold 800 with strongly negative tracking and a widely tracked uppercase subtitle. It has header (`text-xl`), hero (`text-6xl` through `text-[132px]`), and footer (`text-2xl`, subtitle visually hidden) sizes.
2. **Headings.** Extra-bold with `-0.015em` to `-0.035em` tracking. The product page heading reaches `text-[52px]` at `lg`; checkout uses `text-4xl sm:text-[46px]`; catalog section headings reach `text-[44px]`.
3. **Eyebrows / uppercase labels.** `text-[9px]` through `text-[11px]`, bold, uppercase, positive 0.12–0.2em tracking, and `text-muted-foreground`. Customer examples include “Elegí tu presentación”, “Último paso”, and “VER CATÁLOGO”.

Prices are always bold or extra-bold with negative tracking. The hierarchy is card `text-base sm:text-xl`, product detail `text-[38px]`, cart subtotal `text-3xl`, and checkout total `text-[32px]`. `formatArsPrice()` in `src/lib/catalog.ts` is the sole price formatter and uses `Intl.NumberFormat("es-AR", { currency: "ARS", maximumFractionDigits: 0 })`.

## A.4 Radii

`--radius: 0.25rem` in `globals.css:96`; `@theme inline` defines a multiplicative scale.

| Token          | Formula                     | Effective value    |
| -------------- | --------------------------- | ------------------ |
| `--radius-sm`  | `calc(var(--radius) * 0.6)` | `0.15rem` (2.4 px) |
| `--radius-md`  | `calc(var(--radius) * 0.8)` | `0.2rem` (3.2 px)  |
| `--radius-lg`  | `var(--radius)`             | `0.25rem` (4 px)   |
| `--radius-xl`  | `calc(var(--radius) * 1.4)` | `0.35rem` (5.6 px) |
| `--radius-2xl` | `× 1.8`                     | `0.45rem`          |
| `--radius-3xl` | `× 2.2`                     | `0.55rem`          |
| `--radius-4xl` | `× 2.6`                     | `0.65rem`          |

Tailwind v4 resolves bare `rounded` to `var(--radius)`, which equals `rounded-lg` here. Thus store `rounded` and shadcn primitive `rounded-lg` render identically. The visual language is almost square: large controls use 4 px, while `rounded-full` is reserved for cart counts and accord color dots.

## A.5 Spacing, grid, and containers

- **Container:** `mx-auto max-w-page`, backed by the `--container-page: 1440px` token in the `@theme inline` layer (`src/app/globals.css`), in the header, footer, catalog section, and store pages.
- **Gutters:** `px-5` on mobile and `lg:px-16` on desktop.
- **Catalog grid:** `grid-cols-2 gap-3.5 lg:grid-cols-4 lg:gap-7` in `catalog/grid.tsx`; `grid-skeleton.tsx` mirrors it, while related products use `gap-5`.
- **Product detail:** fixed gallery `lg:w-[620px] lg:shrink-0`, flexible purchasing column, `gap-9 lg:gap-14`.
- **Checkout:** form `max-w-[680px]`, summary `lg:w-[440px]`.
- **Hero:** `h-[520px] lg:h-[720px]`.
- **Product sections:** `border-t pt-11`.

Tailwind spacing coexists with inherited mockup values such as `p-[30px]`, `p-[22px_24px]`, `gap-[72px]`, `gap-[11px]`, `gap-[18px]`, `px-[18px]`, and checkout CTA `py-[22px]`.

### Control heights

| Context                                        | Height                             |
| ---------------------------------------------- | ---------------------------------- |
| shadcn `default` button, input, select trigger | `h-8` (32 px)                      |
| Desktop search and filter chips                | `h-9` (36 px)                      |
| Mobile header icon squares and touch chips     | 46 px                              |
| Mobile cart drawer inputs and selects          | `h-[50px]`                         |
| Cart drawer action buttons                     | `h-[54px]`                         |
| “Filtrar · N” trigger                          | `h-12` (48 px)                     |
| WhatsApp CTA                                   | `h-auto` plus `py-5` / `py-[22px]` |

Large CTAs consistently use shadcn `<Button>` with `h-auto` to override its primitive `h-8`, then add `py-*` and `text-[15px]`.

## A.6 Icons and images

- **Lucide:** explicit sizes (`size-4` generally, `size-[17px]` or `size-[19px]` in headers, `size-5` for checkout CTAs). Header icons use `strokeWidth={1.6}` rather than the default 2.
- Used icons include `Menu`, `Search`, `ShoppingBag`, `ChevronDown`, `SlidersHorizontal`, `MessageCircle`, `Minus`, `Plus`, `X`, `ShieldCheck`, and `Loader2`.
- **Photos:** `next/image` with `fill`, `object-contain p-4`, and explicit `sizes` in `product-image.tsx`. Containment preserves bottle caps against cream; the first four grid cards and first gallery image use `priority`.
- **Placeholder:** `src/components/bottle-placeholder.tsx` is an inline SVG bottle silhouette painted with `fill-border` and `fill-secondary`.
- Fragrantica imagery is never public; it is reference material for the panel.

## A.7 Existing component patterns

### Product card — `store/product-card.tsx`

The card is reused by grids, the home page, and related products:

```
<Link> group · rounded · border · bg-card · hover:border-foreground
  ├ photo strip: h-[180px] sm:h-[260px] · border-b · bg-background
  │  └ optional label badge: absolute top-3 left-3, primary background, 9px uppercase
  └ body: p-3.5 sm:p-[18px] · gap-1.5
     ├ brand eyebrow
     ├ h2|h3 product name
     ├ muted metadata, hidden on mobile
     ├ “desde” plus bold price pushed to the bottom
     └ bordered 10px size chips, sm and above
```

Hover changes the border, never shadow or scale. The heading level is a `headingLevel: "h2" | "h3"` prop to preserve the heading outline in each containing grid.

### Filter chip — `store/catalog/filter-controls.tsx`

`<button aria-pressed>` has active `border-primary bg-primary text-primary-foreground` and inactive `border-input bg-background hover:bg-muted` styles. `compact` changes the standard `h-[46px]` height to `h-9` in desktop controls.

### Accord chip, cart badge, and filter containers

`accord-chip.tsx` uses `rounded-sm px-3 py-1.5 text-xs font-semibold` and inline color from `getChipColor()`. `CartBadge` has `chip` (desktop bar) and `button` (46 px square) variants; it is informational and the header owns the Sheet trigger.

The same `FilterControls` render on desktop and mobile. Only their containers differ: `filter-panel.tsx` uses a bordered box; `filter-drawer.tsx` uses a bottom `Sheet`, `rounded-t-xl`, and `max-h-[88vh]`. `useQueryStates` keeps state in the URL. The mobile trigger displays “Filtrar · N” and uses active chip styling when `N > 0`.

### Product detail blocks and gallery

`technical-details.tsx`, `characteristic-bars.tsx`, and each `pyramid.tsx` level share `rounded border bg-card p-[30px]` or `p-6`, with a bold `h2`. Technical details omit absent rows. Characteristics use five filled or empty steps and clearly disclose in customer text that values come from ParfamMdq's product experience, not community votes. Pyramid notes are neutral chips; only accords use dictionary colors.

`product/gallery.tsx` uses shadcn Embla `Carousel`: it loops only with more than one photo, shows arrows only at desktop widths, supports mobile swipe, and renders at most four `grid-cols-4` thumbnails. The active thumbnail has `border-foreground ring-1 ring-foreground`.

### Purchase selector — `store/product/purchase.tsx`

Every `RadioGroup` option sits in a fully clickable `<label>`. The border is always `border-[1.5px]`; only color switches from `border-border` to `border-foreground`, preventing a half-pixel layout shift. Quantity controls use `Minus` and `Plus` in `rounded border bg-card`. The purchase CTA remains Spanish: “Agregar al carrito · {variante}”; the secondary outline CTA is “Consultar por WhatsApp”.

## A.8 Loading, empty, and error states

- **Loading:** `GridSkeleton` matches product-card photo heights and four text lines to avoid layout shift. Each `Suspense` has a sized fallback; catalog totals use a fixed-width `animate-pulse` span.
- **Empty:** `rounded border border-dashed p-16 text-center text-muted-foreground`, with Spanish copy appropriate to active filters and the same pattern in checkout without items.
- **Form error:** `<p class="text-xs text-destructive">` below the field; the phone helper is replaced by its error rather than stacked.
- **Notice:** shadcn `Alert`, including `ShieldCheck` beside “No pedimos datos de pago” and `variant="destructive"` for price changes.
- **Confirmation:** `sonner` `toast.success` describes `producto · variante · N unidades`.

## A.9 Responsive behavior

There are no custom breakpoints: Tailwind `sm` is 640 and `lg` is 1024. `lg` is the primary split: header, footer, and filters render separate desktop and mobile branches using `hidden lg:flex` and `lg:hidden`; `sm` makes cards denser.

Cream is fixed. There is no selectable dark mode and no system-preference theme. The dark custom variant only prevents shadcn primitives from restoring `prefers-color-scheme` behavior.

## A.10 Voice and tone

The customer voice is **es-AR, voseo, second person, short sentences**. `<html>` uses `lang="es-AR"`; visible copy keeps accents and opening marks.

Representative customer copy remains intentionally Spanish:

- “Recorré el catálogo y elegí entre frasco entero, tester o decant, en el tamaño que quieras probar.”
- “Sumá una o varias fragancias. Podés seguir mirando el catálogo antes de cerrar el pedido.”
- “Te pedimos nombre y teléfono, y se abre el chat con el pedido ya escrito.”
- “¿A nombre de quién armamos el pedido?”
- “No hay fragancias con esos filtros. Probá limpiando alguno.”
- “Consultá el precio”
- “¡Hola! Quería consultar por el {nombre} de {marca} ({variante}).”

The corpus uses “nosotros/vos”, never impersonal language; voseo imperatives such as “Recorré”, “Sumá”, “Elegí”, “Consultá”, and “Probá”; explicit service limits such as “No pedimos datos de pago”; no generic ecommerce jargon; no emoji; and opening `¿` and `¡` marks. Code, identifiers, comments, and developer documentation are English.

## A.11 WhatsApp checkout interaction

The site **does not charge**. The design expresses this through four choices.

1. **Green appears only when leaving for WhatsApp.** `--whatsapp` marks the system boundary. Cart and filter CTAs are black.
2. **Contact has two visual weights.** “Consultar por WhatsApp” is an outline secondary action; “Finalizar pedido por WhatsApp” and “Enviar pedido por WhatsApp” are full-width solid green actions, both with `MessageCircle`.
3. **Checkout asks for and discloses two fields.** The external raw contract keeps `nombre` and `telefono`; the UI fixes `+54 9` in a muted `<span>` adjacent to the input and states “No pedimos datos de pago”. Its honeypot is offscreen (`absolute -left-[9999px]`), not `hidden`.
4. **The submit button narrates three states.** “Verificando tu carrito…” → “Armando el pedido…” with `Loader2 animate-spin` → “Enviar pedido por WhatsApp”. It remains disabled while server-side price reconciliation runs.

`window.open("", "_blank")` runs synchronously on click before the Server Action `await`, otherwise Safari and Chrome can block the popup. On success it receives `location.href`; invalid forms or failed actions close it. The route remains `/pedido/{numero}/gracias?link=…`, and the page verifies the link is a `https://wa.me/…` URL before using it as `href`.

`SiteSetting.whatsappMessageTemplate` is editable and retains external placeholders `{{marca}}`, `{{items}}`, `{{total}}`, `{{nombre}}`, and `{{numero}}`. `src/lib/store/order-message.ts` formats each item as `• Marca Producto — Variante xN — $precio`.

## A.12 Existing accessibility

- `getChipColor()` guarantees 4.5:1 accord-chip contrast with background correction.
- WhatsApp CTA contrast is calculated and documented in `globals.css:78-88`.
- `headingLevel` on product cards, grids, and catalog sections preserves a valid heading outline.
- `SheetTitle` is `sr-only` where the visual design has no heading.
- Storefront search uses an `sr-only` `<label>`; storefront filter
  `SelectTrigger` controls have customer-facing `aria-label` text. Some admin
  selects rely on nearby visual labels and need a separate accessibility audit.
- Filter chips use `aria-pressed`; gallery thumbnails and pagination use `aria-current`.
- Characteristic bars use `role="img"` with customer-facing labels such as `aria-label="Duración: 4 de 5"`.
- Pagination uses real server-rendered `<a href>` links, with `aria-disabled` and `tabIndex={-1}` at the ends.
- Decorative bottle SVGs are `aria-hidden`; mobile navigation items use `min-h-11` (44 px).

---

# Part B — Remaining improvements

This section records open design findings against the current code. The focus,
touch-target, navigation, cart-announcement, and obsolete-comment findings from
the earlier design audit have been addressed; their current safeguards are
summarized below. None of the remaining proposals adds dependencies or changes
the stack.

## Ranked summary

| #    | Item                                                         | Type        | Effort | Risk   |
| ---- | ------------------------------------------------------------ | ----------- | ------ | ------ |
| B-01 | Light `--destructive` is 4.12:1, below AA for form errors    | A11y        | S      | Low    |
| B-02 | Control borders are 1.26:1 and fail 1.4.11 non-text contrast | A11y        | M      | Medium |
| B-08 | Eyebrow label typography scale is ad hoc                     | Consistency | L      | Medium |
| B-09 | Two spellings for the same base radius                       | Consistency | S      | Low    |

S means at most one file or a mechanical change; M means several files with a bounded criterion; L requires a prior design decision.

## B-01 · Light-mode destructive contrast is below AA

`--destructive: oklch(0.577 0.245 27.325)` (`#E7000B`) reaches **4.12:1** on `--background` and **4.49:1** on `--card`; normal text requires 4.5:1. The most exposed use is 12 px checkout error text. It appears in `src/app/globals.css`, `src/app/(store)/checkout/_components/checkout-form.tsx`, and panel forms.

Darken `--destructive` to at least 4.5:1 on `--card`; approximately `oklch(0.52 0.21 27.3)` preserves its hue. Verify with the same criterion as `src/lib/color.ts`. This is one CSS line with low visual risk.

## B-02 · Control borders reach only 1.26:1 (WCAG 1.4.11)

`--border` and `--input` are `#DCD5CA`, giving 1.26:1 on background and 1.37:1 on cards. That is acceptable for decorative dividers, but 1.4.11 requires 3:1 where a border alone identifies a control. Inputs, selects, inactive filter chips, quantity controls, unselected variants, and inactive gallery thumbnails depend on it.

Keep `--border` decorative, set functional `--input` to a value reaching 3:1 on both relevant surfaces, then audit store controls that currently use `border-border` and change only actual controls to `border-input`. This is medium risk because catalog visual weight changes and should be reviewed at both desktop widths.

## Resolved since the earlier design audit

- `FOCUS_VISIBLE` in `src/lib/utils.ts` now gives custom storefront filter,
  gallery, header, footer, and purchase controls a shared focus treatment.
  `ProductCard` still uses its own visible ring, so visual consistency can be
  revisited with the control-border work in B-02.
- Purchase quantity buttons use `size-11` (44 px), default filter chips are
  46 px tall, and the link-mode clear action has `min-h-11`. Compact chips are
  an explicit option for desktop layouts.
- Desktop and mobile navigation use `aria-current="page"`; the active link
  keeps foreground text and gains an underline.
- The cart badge is visual (`aria-hidden`), the trigger includes the Spanish
  quantity in its accessible name, and a separate header status region
  announces quantity changes. The trigger still uses `class="contents"`;
  review its focus outline if the trigger markup changes.
- Storefront source comments no longer cite nonexistent `design/` or `brand/`
  files.
- The owner confirmed the venture name as “ParfamMdq Perfumería”. The logo,
  Open Graph image, and `siteDefaults.legalName` now use that spelling.

## B-08 · Typography and spacing are ad hoc

The mockups were transcribed pixel by pixel: 15 arbitrary font sizes, 17 arbitrary tracking values, and at least 10 pixel-based spacings coexist. Some roles differ by one or two pixels without a semantic distinction.

**Resolved:** the repeated container literal is now the `--container-page: 1440px` token (`src/app/globals.css`), consumed as `max-w-page` in place of the 8 hand-written `max-w-[1440px]` occurrences.

The typography scale remains open: normalizing the admin/store eyebrow labels (sizes 9–11px, several distinct tracking values) changes rendered pixels, so it is outside a no-behavior-change refactor and needs an explicit visual decision. After that decision, introduce semantic typography tokens such as `--text-eyebrow`, `--tracking-eyebrow`, `--text-display`, and `--tracking-display`, including a deliberate decision on which values merge.

## B-09 · Nearly identical radii have inconsistent spelling

The code uses `rounded` (4 px), `rounded-lg` (the same 4 px), `rounded-sm` (2.4 px), `rounded-[3px]`, and `rounded-[2px]`. The last three are visually indistinguishable in the small chips, badges, and characteristic steps where they are used; class names do not reveal whether a base radius is intentional.

**Resolved:** `rounded-[3px]` in `src/components/store/product-card.tsx` and `rounded-[2px]` in `src/components/store/product/characteristic-bars.tsx` are now `rounded-md` and `rounded-sm`, respectively.

`rounded` and `rounded-lg` resolving to the same 4 px value remains an open, unaddressed spelling inconsistency: it has no visual effect, so it was left alone.

---

## Appendix: minor findings

- `--muted-foreground` on `--muted` is **4.48:1**, narrowly below AA. It affects `ClearFilters` button mode and muted text over muted hover fills.
- Chart tokens were correctly removed because there were no calls in `src/`.
- The bottle silhouette exists in `bottle-placeholder.tsx`, the cart item row, and the product table. A single size-configurable component could replace the three copies.
- `--font-heading` merely aliases `--font-sans`; give it a distinct family or remove it so it does not imply an unused extension point.
- The informational checkout `AlertTitle` uses `text-muted-foreground`, the only site title styled as secondary text.

## Reproducible contrast measurements

Ratios convert `globals.css` OKLCH values to sRGB and apply WCAG relative luminance, using the same method as `src/lib/color.ts`.

| Pair                               | Ratio   | Normal text AA               |
| ---------------------------------- | ------- | ---------------------------- |
| `foreground` / `background`        | 18.18:1 | ✅                           |
| `foreground` / `card`              | 19.81:1 | ✅                           |
| `muted-foreground` / `background`  | 4.99:1  | ✅                           |
| `muted-foreground` / `card`        | 5.44:1  | ✅                           |
| `muted-foreground` / `muted`       | 4.48:1  | ⚠️ borderline                |
| `whatsapp-foreground` / `whatsapp` | 4.53:1  | ✅ by design                 |
| `success-foreground` / `success`   | 6.53:1  | ✅                           |
| `destructive` / `background`       | 4.12:1  | ❌ B-01                      |
| `destructive` / `card`             | 4.49:1  | ❌ B-01                      |
| `ring` / `background`              | 4.99:1  | ✅ focus needs 3:1           |
| `border` / `background`            | 1.26:1  | ❌ B-02; 1.4.11 requires 3:1 |
| `border` / `card`                  | 1.37:1  | ❌ B-02                      |
| `sidebar-foreground` / `sidebar`   | 12.10:1 | ✅                           |
