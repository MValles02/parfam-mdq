# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Buyers in Mar del Plata, Argentina, who find the store mostly through Instagram. They want to try a fragrance before committing to a full bottle, and they are price-aware. Usage is mobile-first: most visits happen on a phone. Secondary user: the single store owner, who runs the catalog and orders from the admin panel.

## Product Purpose

A perfume store (sealed bottles, testers and decants) that is also a technical reference: each fragrance carries its notes, accords, pyramid and perfumer data. It does not charge. Checkout saves the order, assigns a sequential number (`PM-0042`) and opens a prewritten WhatsApp message; payment and delivery are agreed in chat. Success means a visitor understands what a fragrance is, picks a presentation and sends the order.

## Positioning

Store and technical fragrance reference in one place: the visitor can learn about a perfume (notes, accords, data) and buy it, including in decant form to try it first, in a single flow, with human WhatsApp service in Mar del Plata.

## Operating Context

- Catalog is admin-authored; reference data is internal-only and never shown publicly as-is. Public copy is admin-written Spanish.
- Delivery area: all of Mar del Plata (the site copy also mentions pickup).
- Prices are ARS, always read from the database.

## Capabilities and Constraints

- Presentations: frasco entero, tester, decant. Pages: catalog with URL filters, product, cart, checkout, order confirmation, "Frasco o decant", "Concentraciones", "Cómo comprar", contact.
- UI copy is Spanish (es-AR, voseo). Code and developer docs are English.
- Only PUBLISHED products with active variants are public.
- Stack: Next.js 16, Tailwind v4, shadcn/ui; see AGENTS.md.

## Brand Commitments

- Name "ParfamMdq", tagline "No solo es un perfume", Instagram @parfam_mdq.
- The logo and the cream-on-black color identity are decided and binding. The owner is open to recommendations beyond those two.
- Public copy never names Fragrantica.

## Evidence on Hand

- Real catalog and fragrance reference data (internal dataset, see docs/modules/reference-data.md).
- No real testimonials yet; do not fabricate testimonials, reviews, customer counts or press.
- No supplier or authenticity proof assets on hand.

## Product Principles

1. The technical depth (notes, accords, data) is the differentiator; surface it, do not bury it behind the sales flow.
2. Mobile first: every key task (browse, understand a fragrance, order) must work one-handed on a phone.
3. Reduce the risk of trying: make decants and testers easy to understand and choose.
4. Honest and local: no invented claims; WhatsApp conversation is the human close.
5. Keep the sales flow short: from fragrance to WhatsApp message in few taps.

## Accessibility & Inclusion

No product-specific requirement established; follow general web accessibility basics.
