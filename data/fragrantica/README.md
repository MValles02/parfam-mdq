# data/fragrantica

Catálogo de referencia de fragancias, a partir de dos datasets públicos de Kaggle scrapeados
de Fragrantica. 38 MB en total: se versionan en el repo.

| Archivo            |  Filas | Delimitador | Aporta                                                                                                        |
| ------------------ | -----: | ----------- | ------------------------------------------------------------------------------------------------------------- |
| `fra_cleaned.csv`  | 24.063 | `;`         | Notas ya separadas en Top/Middle/Base, año (92%), país, perfumistas, 5 acordes ordenados. Decimales con coma. |
| `fra_perfumes.csv` | 69.948 | `,`         | Los 70k perfumes, lista completa de acordes, descripción en inglés, rating.                                   |

## Cómo se unen

El **PID** es el número al final de la URL (`…/Afnan/9am-70706.html` → `70706`) y es la clave
de join. `fra_cleaned` está **contenido dentro de** `fra_perfumes`: la unión son 69.948
fragancias.

## Cobertura de notas

| Fuente                                    | Fragancias con pirámide |
| ----------------------------------------- | ----------------------: |
| `fra_cleaned` (campos Top/Middle/Base)    |                  24.063 |
| `fra_perfumes` (parseando la descripción) |                  46.572 |
| **Unión**                                 |        **46.578** (67%) |
| Sin notas en ninguna fuente               |                  23.370 |

El parseo de la descripción usa el patrón fijo de Fragrantica:
`Top notes are A, B and C; middle notes are …; base notes are …`.

## Limpieza necesaria al importar

- **Nombre y marca**: los campos vienen sucios (`accento-overdose-pride-edition`,
  `9am Afnanfor women`). La fuente buena es la URL: `/perfume/<Marca>/<Nombre>-<pid>.html`.
- **Género**: normalizar `women`, `for women`, `unisex`, `for women and men` a un enum.
- **Rating**: `fra_cleaned` usa coma decimal (`1,42`).
- **Acordes**: en `fra_perfumes` vienen como lista de Python (`"['citrus', 'musky']"`).

## Lo que el dataset NO trae

- **Español**: todo viene en inglés. Las traducciones viven en `data/dictionaries/`.
- **Colores de acordes, íconos y grupos de notas**: los definimos nosotros en el diccionario.
- **Concentración** (EDT/EDP): sólo ~800 filas la mencionan → campo manual en el panel.

## Lo que NO se muestra en público

`Description` es el texto autogenerado de Fragrantica: se usa **sólo** para parsear las notas
y como referencia interna en el panel. El texto que ve el cliente lo escribimos en español.
Los ratings se importan para ordenar las sugerencias del buscador del admin, y no se muestran.
