# Module: site settings

## Responsibility

Read and update the singleton SiteSetting row shared by public store output and panel configuration.

## Files

- src/lib/settings.ts: cached public settings read and fallback values.
- src/lib/admin/settings.ts: editable panel DTO.
- src/lib/validations/settings.ts: shared schema.
- src/app/admin/(panel)/configuracion/: authorized settings UI and action.

## Behavior

The public lookup uses tagged caching and a safe fallback for site output. A panel save validates input, requires an administrator, updates the singleton, and invalidates affected cache data. WhatsApp template placeholders {{marca}}, {{items}}, {{total}}, {{nombre}}, and {{numero}} are persisted customer-message syntax and remain unchanged.

The panel form shows a live "Así lo recibís" preview built with `buildOrderMessage` and sample lines, variable chips that append a placeholder to the template, SEO length counters (70/180) with a snippet preview, and a sticky bar (Descartar/Guardar) while the form is dirty.
