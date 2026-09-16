-- ProductImage pasa a guardar la clave del objeto en R2 en vez de la URL
-- absoluta. El host publico (R2_PUBLIC_URL) se vuelve configuracion: cambiar
-- de un pub-xxxx.r2.dev a un dominio propio deja de obligar a reescribir las
-- filas ya cargadas.
--
-- Es un RENAME y no un DROP + ADD (que es lo que genera Prisma por default)
-- para no perder datos si la tabla tuviera filas. Las claves viejas hay que
-- recortarlas a mano si alguna vez se corre esto con URLs absolutas guardadas.
ALTER TABLE "ProductImage" RENAME COLUMN "url" TO "storageKey";

-- FragranceRef_rating_idx queda sin uso y se borra.
--
-- Lo cree en la migracion anterior cuando el buscador ordenaba por
-- `ratingValue DESC NULLS LAST` y el indice servia ese ORDER BY directo. Al
-- pasar al promedio bayesiano el orden es una *expresion*, no las columnas
-- crudas, asi que el planner ya no puede usarlo: verificado con EXPLAIN, todas
-- las consultas resuelven por FragranceRef_search_trgm_idx + un top-N heapsort
-- sobre los 60 candidatos. Mantenerlo solo costaba escrituras en cada import.
DROP INDEX IF EXISTS "FragranceRef_rating_idx";
