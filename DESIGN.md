---
name: ParfamMdq
description: "A typographic, warm, old-luxury lab notebook for perfumes: cream paper, black ink, one typeface, no shadows."
colors:
  cream-paper: "#F2EEE9"
  ink-black: "#000000"
  card-vellum: "#FAF8F5"
  warm-taupe-fill: "#E8E2D9"
  taupe-text: "#6B655C"
  ledger-line: "#DCD5CA"
  field-line: "#8C857B"
  counter-green: "#107D3A"
  correction-red: "#E7000B"
  sage-confirm-bg: "#E4EDE4"
  sage-confirm-text: "#2C5E34"
  sage-confirm-border: "#B9D2BC"
typography:
  display:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: 132px
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: -0.03em
  headline:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: 44px
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -0.03em
  title:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: 20px
    fontWeight: 700
    letterSpacing: -0.015em
  body:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
  label:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: 11px
    fontWeight: 700
    letterSpacing: 0.16em
  price:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: 38px
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -0.03em
rounded:
  sm: 2.4px
  md: 3.2px
  lg: 4px
  xl: 5.6px
  full: 9999px
spacing:
  gutter-mobile: 20px
  gutter-desktop: 64px
  grid-gap-mobile: 14px
  grid-gap-desktop: 28px
  container: 1440px
  card-padding-mobile: 14px
  card-padding-desktop: 18px
  touch-target: 44px
components:
  button-primary:
    backgroundColor: "{colors.ink-black}"
    textColor: "{colors.cream-paper}"
    rounded: "{rounded.lg}"
    typography: "{typography.body}"
  button-whatsapp:
    backgroundColor: "{colors.counter-green}"
    textColor: "{colors.cream-paper}"
    rounded: "{rounded.lg}"
    height: 54px
  button-outline:
    backgroundColor: "{colors.cream-paper}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.lg}"
    typography: "{typography.body}"
  chip:
    backgroundColor: "{colors.cream-paper}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.lg}"
    height: 46px
    padding: 18px
  chip-active:
    backgroundColor: "{colors.ink-black}"
    textColor: "{colors.cream-paper}"
    rounded: "{rounded.lg}"
    height: 46px
    padding: 18px
  product-card:
    backgroundColor: "{colors.card-vellum}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.lg}"
    padding: 18px
  input:
    backgroundColor: "{colors.cream-paper}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.lg}"
    typography: "{typography.body}"
  accord-track:
    backgroundColor: "{colors.ledger-line}"
    rounded: "{rounded.sm}"
    height: 8px
---

# Design System: ParfamMdq

## Overview

**Creative North Star: "The Lab Notebook"**

The store reads as a perfumer's notebook that happens to sell perfume: cream paper, black ink, hairline rules, and annotated technical data (a notes pyramid, accord bars, a spec list) sitting next to a shop. Nothing is decorated. Structure comes from 1px rules and from the type itself.

It is typographic (the logo is set type, and hierarchy comes from weight, size and tracking in one family), warm (taupe neutrals, not grey), precise (small radii, exact 1px rules, tabular data) and old-luxury (restraint, generous margins, tracked small labels, confidence from tight display type rather than ornament).

The system explicitly rejects luxury-gold, metallic and foil treatments, and modern luxury (glossy surfaces, dark black-and-gold, glassmorphism).

**Key Characteristics:**

- Cream paper surface with black ink as the only emphasis.
- One typeface, Outfit, with hierarchy built from weight, size and tracking.
- Flat surfaces: 1px Ledger Line borders, no box-shadows.
- Tiny radii (4px base); rectangular and notebook-like.
- Technical data rendered as annotated, ledger-like rows.
- Mobile-first, with 44px minimum touch targets.

## Colors

The palette is cream and black with warm taupe neutrals. One green is reserved for WhatsApp. No dark mode exists: the dark variant is deliberately neutralized.

### Primary

- **Ink Black** (#000000): text, solid buttons, active chips, badges and hover borders. `--foreground` and `--primary`.

### Secondary

- None. The system has no secondary brand color.

### Neutral

- **Cream Paper** (#F2EEE9): the page background and the product photo area. `--background`.
- **Card Vellum** (#FAF8F5): raised surfaces such as cards and popovers. `--card` and `--popover`.
- **Warm Taupe Fill** (#E8E2D9): hover and placeholder fills. `--secondary`, `--muted` and `--accent`.
- **Taupe Text** (#6B655C): secondary text, eyebrows and the focus ring colour. `--muted-foreground` and `--ring`.
- **Ledger Line** (#DCD5CA): structural 1px borders and the accord track. `--border`.
- **Field Line** (#8C857B): the stronger border on chips, inputs and secondary buttons. `--input`.

### Functional

- **Counter Green** (#107D3A): the WhatsApp call to action, with cream text. `--whatsapp`.
- **Correction Red** (#E7000B): errors and destructive actions. `--destructive`.
- **Sage Confirm** (#E4EDE4 background, #2C5E34 text, #B9D2BC border): published and success states. `--success`, `--success-foreground` and `--success-border`.

Accord colors are database data, not tokens.

**The One Ink Rule.** Black is the only emphasis. Every solid call to action and every active state is ink on cream.

**The Counter Green Rule.** Green appears only on the call to action that leaves the store for WhatsApp, at most one per view.

**The Database Color Rule.** Accord colors come from data through `getChipColor`, only as bar fills and small dots, and are never promoted to theme tokens.

## Typography

**Font:** Outfit only (variable, loaded through next/font). `--font-heading` aliases `--font-sans`; there is no pairing.

- **Display:** 800 weight, tracking -0.03em, line-height 0.9. The hero logo is 60px on mobile, 96px at sm and 132px at lg.
- **Headline:** 800 weight, tracking -0.03em. Catalog section titles are 32px on mobile and 44px at lg; the product detail title is 32px and 52px at lg (tracking -0.035em).
- **Title:** 700 weight, 20px, tracking -0.015em, for technical-detail section headings. Product-card titles are 14px, rising to 18px from sm.
- **Body:** 14px, regular. Secondary copy and metadata drop to 12px.
- **Label:** 700 weight, 9-11px, tracking 0.16-0.18em, uppercase for eyebrows. The product-card eyebrow is 11px on mobile and 10px from sm.
- **Price:** 800 weight. The detail price is 38px with tracking -0.03em; the card price is 16px, rising to 20px from sm, with tracking -0.02em.

**The Tracked Label Rule.** Uppercase bold labels of 9-11px with 0.12-0.2em tracking are for eyebrows and section tags only, never sentences.

**The Set Type Rule.** The logo is text in Outfit 800 with tracking -0.03em and a tracked "Perfumería" subtitle. Never replace it with an image or a second typeface.

## Layout

Mobile-first: the primary use is a phone. The page container is 1440px max, with 20px side padding and 64px at lg. The catalog grid is 2 columns on mobile (14px gap) and 4 columns at lg (28px gap). Breakpoints are sm 640px and lg 1024px only.

Touch targets are at least 44px, achieved with pseudo-element hit areas where the visible control is smaller; mobile touch controls are 46, 50 or 54px high. The mobile header is sticky and hides on scroll down. The hero is 55svh, rising to 68svh. Technical details collapse into details/summary below lg.

## Elevation & Depth

The store is flat. Depth comes from tonal layering (Cream Paper for the page, Card Vellum for raised surfaces, Warm Taupe Fill for hover and placeholders) plus 1px Ledger Line borders. Hover is a border shift to ink.

**The No-Shadow Rule.** The store has no box-shadows. Separate surfaces with tone and 1px rules.

**The Cream Blend Rule.** Product photos use mix-blend-multiply on the paper surface so white studio backgrounds disappear.

## Shapes

The base radius is 4px, with tiny radii from 2.4px to 5.6px. `rounded-full` is used only for count badges and accord dots. 1px borders mark structure everywhere it is needed. The result is rectangular and notebook-like.

## Components

### Buttons

Default is ink on cream, hover ink at 80%. Outline and ghost variants fill with Warm Taupe Fill on hover. The WhatsApp button is Counter Green with cream text, 54px high in the cart. Focus shows a 3px ring at 50% opacity in the taupe ring colour.

### Chips

Filter chips are bordered on cream when inactive and filled with ink when active. They are 46px high by default and 36px when compact, with 13px medium text.

### Product Card

A bordered Card Vellum card. The photo area is 180px high, rising to 260px from sm, on cream with a bottom rule. An ink badge sits top left, followed by a tracked eyebrow with the brand, a bold title, "desde" with the price, and size chips on desktop. Hover shifts the border to ink.

### Inputs

A Field Line border with a 4px radius. Focus shows a ring-coloured border plus a 3px ring. Error text is 12px in destructive red.

### Navigation

The header has the logo on the left and 14px medium links, with the active link underlined at 4px offset and marked with aria-current. On mobile, three 46px bordered icon buttons sit beside a Sheet menu that opens from the right.

### Signature: Accord Bars

An 8px-high track in Ledger Line with a 2.4px radius. The fill uses the database colour. The accord name is 14px semibold, with the strength percentage beside it.

### Signature: Notes Pyramid

Three "level" boxes on Card Vellum, each with a tracked eyebrow and neutral note chips.

### Signature: Spec List

A dl with rows separated by bottom rules. Labels are Taupe Text at 13px; values are 14px semibold.

### Signature: Logo

Set type in Outfit 800 with a tracked "Perfumería" subtitle, in header, hero and footer sizes.

## Do's and Don'ts

### Do:

- Do keep the single family and create hierarchy with weight, size and tracking.
- Do keep surfaces flat and structure them with 1px rules.
- Do keep ink as the one emphasis.
- Do render technical data (notes, accords, specs) as annotated, ledger-like rows.
- Do keep touch targets at 44px or larger.
- Do pass database colours through `getChipColor`.

### Don't:

- Don't use gold, bronze, foil, metallic gradients or any luxury-gold palette.
- Don't use modern-luxury tropes: glossy surfaces, glassmorphism, a black-and-gold dark mode, or glow.
- Don't add shadows or soft rounded-2xl-style corners.
- Don't add dark mode.
- Don't use green anywhere except the WhatsApp call to action and success confirmation states.
- Don't hotlink or show reference-data imagery that is not in R2.
- Don't add a second typeface without an explicit decision.
