-- ==================================================
-- TABLA: campanas_publicitarias
-- Campañas de publicidad por usuario
-- ==================================================
CREATE TABLE IF NOT EXISTS "campanas_publicitarias" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "url_audio" TEXT,  -- URL del audio publicitario
    "s3_key" TEXT,
    "duracion_segundos" INTEGER DEFAULT 30,
    "tipo" TEXT DEFAULT 'audio' CHECK (tipo IN ('audio', 'texto', 'mixto')),
    
    -- Programación
    "fecha_inicio" TIMESTAMPTZ DEFAULT NOW(),
    "fecha_fin" TIMESTAMPTZ,
    "esta_activo" BOOLEAN DEFAULT true,
    
    -- Métricas
    "reproducciones" INTEGER DEFAULT 0,
    "impresiones" INTEGER DEFAULT 0,
    
    -- Segmentación
    "regiones" JSONB DEFAULT '[]',  -- Regiones donde se muestra
    "categorias" JSONB DEFAULT '[]',  -- Categorías de noticias
    
    -- Multi-tenancy
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,  -- ✅ Aislamiento por usuario
    
    -- Metadata
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE "campanas_publicitarias" IS 'Campañas publicitarias por usuario';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_campanas_user_id ON "campanas_publicitarias"("user_id");
CREATE INDEX IF NOT EXISTS idx_campanas_activo ON "campanas_publicitarias"("esta_activo");
CREATE INDEX IF NOT EXISTS idx_campanas_fechas ON "campanas_publicitarias"("fecha_inicio", "fecha_fin");
