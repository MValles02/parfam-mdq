# Reference dictionaries

This directory contains the Spanish translations and normalization data used by the Fragrantica importer. These files are input data, not TypeScript implementation, so their JSON property names and values are preserved.

| File              | Content                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| accords.es.json   | 93 dataset accords with slug, English and Spanish names, a display family, and an OKLCH color. |
| notes.es.json     | Frequently used notes with slug, English and Spanish names, and usage count.                   |
| note-aliases.json | Dataset typos and variants mapped to canonical note names.                                     |

## Missing translations

A note absent from notes.es.json is still imported with nameEs set to null. The UI falls back to English until an administrator completes the Spanish translation through /admin/notas. These source dictionaries seed imports; after import, database Note and Accord rows are the source used by the application.

## Updating a translation

Correct source data before a new import when possible. For an existing database row, use /admin/notas; changing JSON after import does not update persisted data.
