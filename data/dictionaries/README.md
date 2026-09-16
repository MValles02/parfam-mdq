# data/dictionaries

Traducciones al español que `data/fragrantica/*.csv` no trae (ver el README de
esa carpeta). Las consume `scripts/import-fragrantica.ts` al armar las tablas
`Note` y `Accord`.

| Archivo             | Contenido                                                                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accords.es.json`   | Los 93 acordes del dataset: `slug`, `en`, `es`, `family` (agrupación usada sólo para elegir el color) y `color` (paleta propia en oklch, no copiada de ningún tercero).                         |
| `notes.es.json`     | Las ~500 notas más frecuentes (cubren ~97% de las apariciones), con `slug`, `en`, `es` y `usageCount`.                                                                                          |
| `note-aliases.json` | Typos del dataset (`"vanila"`, `"sandalowood"`, `"cardamon"`, ...) que se normalizan a su forma canónica antes de crear la nota, para no duplicar el mismo ingrediente con dos slugs distintos. |

## Notas sin traducir

Una nota que no está en `notes.es.json` se importa igual (con `nameEs = null`)
y la UI cae al inglés hasta que se complete. Tras la corrida completa del
importador quedaron **1.398 de 1.882** notas sin traducir — son la cola larga
de ingredientes que aparecen en pocas fragancias; se completan desde
`/admin/notas` a medida que hace falta, no hace falta traducirlas todas de
antemano.

## Si hace falta corregir una traducción

Estos JSON son la semilla inicial. Una vez importados, lo que ve la tienda
sale de las tablas `Note`/`Accord` en la base — corregir el JSON después de
importar no cambia nada ya cargado. El lugar para arreglar una traducción
puntual, tanto antes como después de importar, es `/admin/notas` (Fase 3).
