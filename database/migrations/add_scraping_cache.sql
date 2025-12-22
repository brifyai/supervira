-- ==================================================
-- Migración: Agregar tabla scraping_cache
-- Fecha: 12/12/2024
-- Propósito: Cache de previews para ahorrar créditos ScrapingBee
-- ==================================================

-- Crear tabla scraping_cache
CREATE TABLE IF NOT EXISTS "scraping_cache" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "fuente_id" UUID REFERENCES "fuentes_final"("id") ON DELETE CASCADE,
    "fuente_url" TEXT NOT NULL UNIQUE,
    "noticias" JSONB NOT NULL DEFAULT '[]',
    "categorias_conteo" JSONB DEFAULT '{}',
    "total_noticias" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "expires_at" TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_scraping_cache_url ON "scraping_cache"("fuente_url");
CREATE INDEX IF NOT EXISTS idx_scraping_cache_expires ON "scraping_cache"("expires_at");

-- Comentarios
COMMENT ON TABLE "scraping_cache" IS 'Cache de escaneos de páginas principales';

-- Política RLS (acceso público para lectura, solo backend para escritura)
ALTER TABLE "scraping_cache" ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer (cache compartido)
CREATE POLICY "scraping_cache_read" ON "scraping_cache"
    FOR SELECT USING (true);

-- Política: Solo service_role puede insertar/actualizar/eliminar
CREATE POLICY "scraping_cache_write" ON "scraping_cache"
    FOR ALL USING (auth.role() = 'service_role');

-- Función para limpiar cache expirado (opcional, ejecutar con cron)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM scraping_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
