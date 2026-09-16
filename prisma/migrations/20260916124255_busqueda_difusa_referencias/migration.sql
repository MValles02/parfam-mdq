-- Busqueda difusa para el buscador de referencias del panel (Fase 3).
--
-- Prisma no puede declarar extensiones ni indices GIN de operator class en el
-- schema, asi que esta migracion se escribe a mano. Sin esto, buscar por
-- "contiene" sobre las ~70k filas de FragranceRef es un seq scan.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() viene declarada STABLE (depende del search_path para resolver el
-- diccionario), y Postgres no indexa funciones que no sean IMMUTABLE. El wrapper
-- fija el diccionario por nombre calificado, lo que la vuelve determinista, y
-- recien ahi se puede usar en un indice de expresion.
CREATE OR REPLACE FUNCTION parfam_normalize(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  PARALLEL SAFE
  STRICT
AS $$
  SELECT lower(public.unaccent('public.unaccent'::regdictionary, $1))
$$;

-- El buscador acepta "sauvage dior", que mezcla nombre y marca. Con las dos
-- columnas en tablas distintas, el OR obliga a un seq scan aunque cada una
-- tenga su indice (medido: 293 ms). Desnormalizar nombre + marca en una sola
-- columna deja la busqueda entera en un unico indice GIN.
ALTER TABLE "FragranceRef" ADD COLUMN "searchText" TEXT NOT NULL DEFAULT '';

UPDATE "FragranceRef" f
   SET "searchText" = f."name" || ' ' || b."name"
  FROM "Brand" b
 WHERE b."id" = f."brandId";

-- gin_trgm_ops es lo que hace que un LIKE '%algo%' use indice.
CREATE INDEX "FragranceRef_search_trgm_idx"
  ON "FragranceRef"
  USING gin (parfam_normalize("searchText") gin_trgm_ops);

-- La marca tambien se busca sola (filtro por marca en el panel).
CREATE INDEX "Brand_name_trgm_idx"
  ON "Brand"
  USING gin (parfam_normalize("name") gin_trgm_ops);

-- El buscador ordena por rating: este indice evita ordenar todo el resultado
-- cuando la busqueda es poco selectiva (ej. "de").
CREATE INDEX "FragranceRef_rating_idx"
  ON "FragranceRef" ("ratingValue" DESC NULLS LAST, "ratingCount" DESC NULLS LAST);

-- /admin/notas lista las notas sin traducir ordenadas por uso.
CREATE INDEX "Note_untranslated_idx"
  ON "Note" ("usageCount" DESC)
  WHERE "nameEs" IS NULL;
