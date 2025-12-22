-- =====================================================
-- MIGRACIÓN: Normalización de Regiones
-- Fecha: 2025-11-21
-- Descripción: Normalizar todas las referencias a regiones
--              usando configuraciones_regiones como FK
-- =====================================================

-- IMPORTANTE: Ejecutar este script en un ambiente de desarrollo primero
-- y hacer BACKUP de la base de datos antes de ejecutar en producción

BEGIN;

-- =====================================================
-- PASO 1: AGREGAR COLUMNA REGION A NOTICIEROS
-- =====================================================

-- Agregar columna region si no existe
ALTER TABLE "noticieros" 
ADD COLUMN IF NOT EXISTS "region" TEXT;

-- Migrar datos existentes (asignar Nacional por defecto)
UPDATE "noticieros" 
SET "region" = 'Nacional' 
WHERE "region" IS NULL;

-- Agregar foreign key
ALTER TABLE "noticieros"
ADD CONSTRAINT "noticieros_region_fkey"
FOREIGN KEY ("region") REFERENCES "configuraciones_regiones"("region") ON UPDATE CASCADE;

-- Crear índice para performance
CREATE INDEX IF NOT EXISTS "idx_noticieros_region" ON "noticieros"("region");

COMMIT;

-- =====================================================
-- PASO 2: MODIFICAR PLANTILLAS PARA USAR FOREIGN KEY
-- =====================================================

BEGIN;

-- Verificar regiones inválidas antes de migrar
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT p.region) INTO invalid_count
    FROM "plantillas" p
    LEFT JOIN "configuraciones_regiones" cr ON p.region = cr.region
    WHERE cr.region IS NULL;
    
    IF invalid_count > 0 THEN
        RAISE NOTICE 'Encontradas % regiones inválidas en plantillas. Serán convertidas a Nacional.', invalid_count;
    END IF;
END $$;

-- Corregir regiones inválidas
UPDATE "plantillas"
SET "region" = 'Nacional'
WHERE "region" NOT IN (SELECT "region" FROM "configuraciones_regiones");

-- Eliminar constraint anterior si existe
ALTER TABLE "plantillas"
DROP CONSTRAINT IF EXISTS plantillas_region_check;

-- Agregar foreign key
ALTER TABLE "plantillas"
ADD CONSTRAINT "plantillas_region_fkey"
FOREIGN KEY ("region") REFERENCES "configuraciones_regiones"("region") ON UPDATE CASCADE;

COMMIT;

-- =====================================================
-- PASO 3: MODIFICAR NOTICIAS_SCRAPEADAS PARA USAR FK
-- =====================================================

BEGIN;

-- Verificar regiones inválidas
DO $$
DECLARE
    invalid_count INTEGER;
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM "noticias_scrapeadas"
    WHERE "region" IS NULL;
    
    SELECT COUNT(DISTINCT n.region) INTO invalid_count
    FROM "noticias_scrapeadas" n
    LEFT JOIN "configuraciones_regiones" cr ON n.region = cr.region
    WHERE cr.region IS NULL AND n.region IS NOT NULL;
    
    IF null_count > 0 THEN
        RAISE NOTICE 'Encontradas % noticias sin región. Serán asignadas a Nacional.', null_count;
    END IF;
    
    IF invalid_count > 0 THEN
        RAISE NOTICE 'Encontradas % regiones inválidas. Serán convertidas a Nacional.', invalid_count;
    END IF;
END $$;

-- Corregir regiones NULL o inválidas
UPDATE "noticias_scrapeadas"
SET "region" = 'Nacional'
WHERE "region" IS NULL OR "region" NOT IN (
    SELECT "region" FROM "configuraciones_regiones"
);

-- Hacer columna NOT NULL
ALTER TABLE "noticias_scrapeadas"
ALTER COLUMN "region" SET NOT NULL;

-- Agregar foreign key
ALTER TABLE "noticias_scrapeadas"
ADD CONSTRAINT "noticias_scrapeadas_region_fkey"
FOREIGN KEY ("region") REFERENCES "configuraciones_regiones"("region") ON UPDATE CASCADE;

COMMIT;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Mostrar resumen de regiones por tabla
SELECT 
    'noticieros' as tabla,
    COUNT(*) as total_registros,
    COUNT(DISTINCT region) as regiones_distintas,
    string_agg(DISTINCT region, ', ' ORDER BY region) as regiones
FROM "noticieros"
GROUP BY tabla

UNION ALL

SELECT 
    'plantillas',
    COUNT(*),
    COUNT(DISTINCT region),
    string_agg(DISTINCT region, ', ' ORDER BY region)
FROM "plantillas"
GROUP BY 1

UNION ALL

SELECT 
    'noticias_scrapeadas',
    COUNT(*),
    COUNT(DISTINCT region),
    string_agg(DISTINCT region, ', ' ORDER BY region)
FROM "noticias_scrapeadas"
GROUP BY 1

UNION ALL

SELECT 
    'fuentes_final',
    COUNT(*),
    COUNT(DISTINCT region),
    string_agg(DISTINCT region, ', ' ORDER BY region)
FROM "fuentes_final"
GROUP BY 1

UNION ALL

SELECT 
    'radios',
    COUNT(*),
    COUNT(DISTINCT region),
    string_agg(DISTINCT region, ', ' ORDER BY region)
FROM "radios"
GROUP BY 1;

-- Verificar que todas las foreign keys están creadas
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'region'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
