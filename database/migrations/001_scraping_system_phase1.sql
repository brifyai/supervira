-- ==================================================
-- MIGRACIÓN: Sistema de Scraping Automático - Fase 1
-- ==================================================
-- Fecha: 20/11/2024
-- Descripción: Agregar columnas de tracking a fuentes_final
--              y crear tabla logs_scraping con tracking de costos
-- ==================================================

-- ==================================================
-- 1. AGREGAR COLUMNAS A fuentes_final
-- ==================================================

-- Columnas para tracking de scraping
ALTER TABLE "fuentes_final" 
ADD COLUMN IF NOT EXISTS "frecuencia_scraping_minutos" INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS "ultima_ejecucion" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "proxima_ejecucion" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "total_scrapes" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "scrapes_exitosos" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "scrapes_fallidos" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "tasa_exito" NUMERIC(5,2) DEFAULT 100.0,
ADD COLUMN IF NOT EXISTS "requiere_js" BOOLEAN DEFAULT false;

-- Comentarios para documentación
COMMENT ON COLUMN "fuentes_final"."frecuencia_scraping_minutos" IS 'Frecuencia de scraping en minutos (60 = cada hora)';
COMMENT ON COLUMN "fuentes_final"."ultima_ejecucion" IS 'Timestamp de la última ejecución de scraping';
COMMENT ON COLUMN "fuentes_final"."proxima_ejecucion" IS 'Timestamp calculado para la próxima ejecución';
COMMENT ON COLUMN "fuentes_final"."total_scrapes" IS 'Total de intentos de scraping';
COMMENT ON COLUMN "fuentes_final"."scrapes_exitosos" IS 'Número de scrapes exitosos';
COMMENT ON COLUMN "fuentes_final"."scrapes_fallidos" IS 'Número de scrapes fallidos';
COMMENT ON COLUMN "fuentes_final"."tasa_exito" IS 'Porcentaje de éxito (scrapes_exitosos / total_scrapes * 100)';
COMMENT ON COLUMN "fuentes_final"."requiere_js" IS 'Si la fuente requiere JavaScript (usa más créditos de ScrapingBee)';

-- ==================================================
-- 2. CREAR TABLA logs_scraping
-- ==================================================

CREATE TABLE IF NOT EXISTS "logs_scraping" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "fuente_id" UUID REFERENCES "fuentes_final"("id") ON DELETE CASCADE,
    "region" TEXT NOT NULL,
    "estado" TEXT NOT NULL CHECK (estado IN ('exitoso', 'fallido', 'parcial')),
    "noticias_encontradas" INTEGER DEFAULT 0,
    "noticias_nuevas" INTEGER DEFAULT 0,
    "noticias_duplicadas" INTEGER DEFAULT 0,
    "tiempo_ejecucion_ms" INTEGER,
    
    -- Tracking de costos y tokens
    "metodo_scraping" TEXT CHECK (metodo_scraping IN ('rss', 'scrapingbee', 'directo')),
    "scrapingbee_credits_usados" INTEGER DEFAULT 0,
    "costo_estimado_usd" NUMERIC(10,6) DEFAULT 0,
    "requests_realizados" INTEGER DEFAULT 0,
    "bytes_descargados" INTEGER DEFAULT 0,
    
    -- Error handling
    "mensaje_error" TEXT,
    "metadata" JSONB DEFAULT '{}',
    
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS "idx_logs_scraping_fuente" ON "logs_scraping"("fuente_id");
CREATE INDEX IF NOT EXISTS "idx_logs_scraping_region" ON "logs_scraping"("region");
CREATE INDEX IF NOT EXISTS "idx_logs_scraping_created" ON "logs_scraping"("created_at");
CREATE INDEX IF NOT EXISTS "idx_logs_scraping_metodo" ON "logs_scraping"("metodo_scraping");
CREATE INDEX IF NOT EXISTS "idx_logs_scraping_estado" ON "logs_scraping"("estado");

-- Comentarios
COMMENT ON TABLE "logs_scraping" IS 'Logs detallados de cada ejecución de scraping con tracking de costos';
COMMENT ON COLUMN "logs_scraping"."scrapingbee_credits_usados" IS 'Créditos de ScrapingBee consumidos (1 básico, 5 con JS, +10 premium proxy, +25 geolocalización)';
COMMENT ON COLUMN "logs_scraping"."costo_estimado_usd" IS 'Costo estimado en USD basado en el plan de ScrapingBee';
COMMENT ON COLUMN "logs_scraping"."metodo_scraping" IS 'Método usado: rss (gratis), scrapingbee (pagado), directo (sin proxy)';

-- ==================================================
-- 3. HABILITAR RLS EN NUEVA TABLA
-- ==================================================

ALTER TABLE "logs_scraping" ENABLE ROW LEVEL SECURITY;

-- Política permisiva para desarrollo
CREATE POLICY "Acceso completo para autenticados" ON "logs_scraping" FOR ALL USING (true);

-- ==================================================
-- 4. FUNCIÓN PARA ACTUALIZAR MÉTRICAS DE FUENTES
-- ==================================================

CREATE OR REPLACE FUNCTION actualizar_metricas_fuente()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar contadores en fuentes_final
    UPDATE "fuentes_final"
    SET 
        "total_scrapes" = "total_scrapes" + 1,
        "scrapes_exitosos" = CASE 
            WHEN NEW.estado = 'exitoso' THEN "scrapes_exitosos" + 1 
            ELSE "scrapes_exitosos" 
        END,
        "scrapes_fallidos" = CASE 
            WHEN NEW.estado = 'fallido' THEN "scrapes_fallidos" + 1 
            ELSE "scrapes_fallidos" 
        END,
        "tasa_exito" = CASE 
            WHEN "total_scrapes" + 1 > 0 
            THEN (("scrapes_exitosos" + CASE WHEN NEW.estado = 'exitoso' THEN 1 ELSE 0 END)::NUMERIC / ("total_scrapes" + 1)::NUMERIC * 100)
            ELSE 100.0
        END,
        "ultima_ejecucion" = NEW.created_at,
        "proxima_ejecucion" = NEW.created_at + (INTERVAL '1 minute' * "frecuencia_scraping_minutos")
    WHERE "id" = NEW.fuente_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar métricas automáticamente
DROP TRIGGER IF EXISTS trigger_actualizar_metricas_fuente ON "logs_scraping";
CREATE TRIGGER trigger_actualizar_metricas_fuente
    AFTER INSERT ON "logs_scraping"
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_metricas_fuente();

-- ==================================================
-- 5. VISTA PARA MÉTRICAS DE COSTOS
-- ==================================================

CREATE OR REPLACE VIEW "v_metricas_scraping_mensual" AS
SELECT 
    DATE_TRUNC('month', created_at) as mes,
    region,
    metodo_scraping,
    COUNT(*) as total_ejecuciones,
    SUM(CASE WHEN estado = 'exitoso' THEN 1 ELSE 0 END) as exitosos,
    SUM(CASE WHEN estado = 'fallido' THEN 1 ELSE 0 END) as fallidos,
    SUM(noticias_nuevas) as total_noticias_nuevas,
    SUM(scrapingbee_credits_usados) as total_creditos_usados,
    SUM(costo_estimado_usd) as costo_total_usd,
    AVG(tiempo_ejecucion_ms) as tiempo_promedio_ms
FROM "logs_scraping"
GROUP BY DATE_TRUNC('month', created_at), region, metodo_scraping
ORDER BY mes DESC, region, metodo_scraping;

COMMENT ON VIEW "v_metricas_scraping_mensual" IS 'Vista agregada de métricas de scraping por mes, región y método';

-- ==================================================
-- 6. INICIALIZAR proxima_ejecucion PARA FUENTES EXISTENTES
-- ==================================================

UPDATE "fuentes_final"
SET "proxima_ejecucion" = NOW() + (INTERVAL '1 minute' * "frecuencia_scraping_minutos")
WHERE "proxima_ejecucion" IS NULL AND "esta_activo" = true;

-- ==================================================
-- FIN DE MIGRACIÓN
-- ==================================================

-- Verificar que todo se creó correctamente
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada exitosamente';
    RAISE NOTICE '📊 Columnas agregadas a fuentes_final: 8';
    RAISE NOTICE '📊 Tabla logs_scraping creada con 14 columnas';
    RAISE NOTICE '📊 Índices creados: 5';
    RAISE NOTICE '📊 Trigger automático configurado';
    RAISE NOTICE '📊 Vista de métricas creada';
END $$;
