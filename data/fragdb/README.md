# data/fragdb

Base de datos de fragancias **FragDB v5** (licencia comercial comprada).

## ⚠️ Falta subir la base completa

Lo que hay en `samples/` es el **sample gratis**: 10 filas por CSV. La base real tiene
137.147 fragancias, 8.210 marcas, 3.102 perfumistas, 2.588 notas y 92 acordes
(ver `data_dictionary.md`).

`fragrances.csv` completo pesa ~900 MB, **muy por encima del límite de 100 MB por archivo de
GitHub**: no se puede subir por la web ni commitear. Va por `scp`, directo a la VPS:

```bash
scp fragdb-v5.zip mateo@<IP-VPS>:/home/mateo/projects/parfam-mdq/data/fragdb/
```

Los archivos que queden en esta carpeta (fuera de `samples/` y los `.md`) están **ignorados
por git**: viven sólo en la VPS, que es donde corre el importador.

## Contenido

| Archivo | Qué es |
|---|---|
| `data_dictionary.md` | Diccionario de campos de los 6 CSV. **Fuente de verdad del importador.** |
| `SPEC.md` | Spec de los parquet companion (comments / news / news_comments). No se usan en la tienda. |
| `samples/` | 10 filas por archivo. Fixtures para testear el importador sin cargar 900 MB. |

## Formato, en corto

Delimitador `|`. Campos compuestos:

- `brand` → `Dior;b3` (nombre;id)
- `accords` → `a34:100;a4:71` (accord_id:porcentaje)
- `notes_pyramid` → `top(n1963,1.0,4.42;…)middle(…)base(…)` o `notes(…)` si no hay niveles
- `perfumers` → `nombre;id;nombre;id`
- `gender`, `season`, `time_of_day` → IDs de `translations.csv`

El español ya viene en el dataset (`note_name_es`, `note_group_es`, `name_es`,
`translations.es`), así que no hay que traducir nada a mano.

## Qué NO se usa

`main_photo`, `info_card`, `user_photoes` y `notes.main_icon` apuntan al CDN de Fragrantica
(`fimgs.net`): **no se hotlinkean ni se muestran en público**, quedan sólo como referencia
interna en el panel. Las imágenes públicas son siempre fotos propias subidas a Cloudflare R2.
`description` es HTML en inglés autogenerado: el texto del cliente lo escribimos nosotros.
