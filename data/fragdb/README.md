# data/fragdb

Acá va el **.zip de FragDB** (licencia comercial ya comprada).

## Qué subir

- El archivo `.zip` tal como lo descargaste, o su contenido descomprimido (CSV y/o parquet).
- No hace falta renombrar nada: el importador se adapta a los nombres reales de los archivos.

## Cómo subirlo

Desde tu PC, apuntando a la VPS:

```bash
scp fragdb.zip mateo@<IP-DE-LA-VPS>:/home/mateo/projects/parfam-mdq/data/fragdb/
```

## Importante

Esta carpeta está **ignorada por git** (salvo este README): los archivos son pesados y
tienen licencia comercial, no deben terminar en GitHub.

Los datos se importan a Postgres con `scripts/import-fragdb.ts` (Fase 1 del PLAN.md).
Las fotos que trae el dataset **no se usan en la web pública** (apuntan a CDN de terceros):
sólo quedan como referencia interna en el panel. Las imágenes públicas son fotos propias
subidas a Cloudflare R2.
