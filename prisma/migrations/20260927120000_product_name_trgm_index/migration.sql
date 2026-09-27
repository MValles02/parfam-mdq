-- Accent-insensitive trigram index for store search (see src/lib/store/queries.ts).
CREATE INDEX "Product_name_trgm_idx" ON "Product" USING gin (parfam_normalize("name") gin_trgm_ops);
