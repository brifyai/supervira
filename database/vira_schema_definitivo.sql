-- ==================================================
-- VIRA - SCHEMA COMPLETO Y DEFINITIVO
-- ==================================================
-- Versión: 3.1 - Actualizado con tablas de scraping
-- Fecha: 17/12/2024
-- Descripción: Schema con soporte para SUPER_ADMIN, ADMIN, USER (multi-tenant)
--              + Sistema completo de scraping y métricas
-- ==================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ==================================================
-- TABLA: users
-- Usuarios del sistema con jerarquía multi-tenant
-- ==================================================
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" TEXT UNIQUE NOT NULL,
    "password_hash" TEXT,  -- ✅ Solo hash, nunca texto plano
    "nombre_completo" TEXT,  -- ✅ Unificado (eliminado full_name y name)
    "email_verified" TIMESTAMPTZ,
    "image" TEXT,
    "role" TEXT DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
    "admin_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,  -- ✅ NUEVO: Para usuarios dependientes
    "company" TEXT DEFAULT 'VIRA',
    "is_active" BOOLEAN DEFAULT true,
    "last_login" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE "users" IS 'Usuarios del sistema VIRA con jerarquía multi-tenant';
COMMENT ON COLUMN "users"."password_hash" IS 'Hash bcrypt del password - NUNCA almacenar texto plano';
COMMENT ON COLUMN "users"."role" IS 'super_admin: config global | admin: dueño cuenta | user: dependiente de admin';
COMMENT ON COLUMN "users"."admin_id" IS 'ID del admin padre (solo para role=user)';

-- ==================================================
-- TABLA: biblioteca_audio
-- ✅ Nombre correcto que usa el código
-- (antes llamada audio_library en schema antiguo)
-- ==================================================
CREATE TABLE IF NOT EXISTS "biblioteca_audio" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nombre" TEXT NOT NULL,
    "audio" TEXT,  -- URL del audio
    "tipo" TEXT NOT NULL CHECK (tipo IN ('voz', 'musica', 'efecto', 'jingle', 'cortina', 'intro', 'outro', 'publicidad', 'cloned_voice')),
    "genero" TEXT CHECK (genero IN ('masculino', 'femenino', 'neutro')),
    "idioma" TEXT DEFAULT 'español',
    "duracion" TEXT,  -- Formato legible (ej: "00:30")
    "duration_seconds" INTEGER,
    "descripcion" TEXT,
    "category" TEXT,  -- cortinas, efectos, musica_fondo
    "s3_key" TEXT,
    "volume_level" NUMERIC(3,2) DEFAULT 1.0,
    "fade_in" INTEGER DEFAULT 0,
    "fade_out" INTEGER DEFAULT 0,
    "reproductions" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "metadata" JSONB DEFAULT '{}',
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE "biblioteca_audio" IS 'Biblioteca de audio: voces, música, efectos, cortinas';

-- ==================================================
-- TABLA: plantillas
-- ✅ Nombre correcto que usa el código
-- (antes llamada newscast_templates en schema antiguo)
-- ==================================================
CREATE TABLE IF NOT EXISTS "plantillas" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nombre" TEXT NOT NULL,  -- ✅ Campo en español
    "descripcion" TEXT,
    "region" TEXT NOT NULL REFERENCES "configuraciones_regiones"("region") ON UPDATE CASCADE,  -- ✅ Con foreign key
    "radio_station" TEXT,
    "duracion_minutos" INTEGER DEFAULT 15,  -- ✅ Campo en español
    "voz_proveedor" TEXT DEFAULT 'local-tts',  -- ✅ Campo en español
    "voz_id" TEXT DEFAULT 'default',
    "incluir_clima" BOOLEAN DEFAULT true,  -- ✅ Campo en español
    "incluir_hora" BOOLEAN DEFAULT true,   -- ✅ Campo en español
    "frecuencia_anuncios" INTEGER DEFAULT 2,  -- ✅ Campo en español
    "categorias" JSONB DEFAULT '[]',
    "configuracion" JSONB DEFAULT '{}',
    "audio_config" JSONB DEFAULT '{"cortinas_enabled": false, "cortinas_frequency": 3, "cortina_default_id": null, "background_music_enabled": false, "background_music_id": null, "background_music_volume": 0.2}',  -- ✅ Config de audio: cortinas y música de fondo
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE "plantillas" IS 'Plantillas de noticieros configurables';

-- ==================================================
-- TABLA: programados
-- ✅ Nombre correcto que usa el código
-- (antes llamada automation_jobs en schema antiguo)
-- ==================================================
CREATE TABLE IF NOT EXISTS "programados" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nombre" TEXT NOT NULL,  -- ✅ Campo en español
    "tipo" TEXT NOT NULL CHECK (tipo IN ('noticiero', 'publicacion_social', 'scraping')),
    "horario" TEXT,  -- Expresión cron
    "esta_activo" BOOLEAN DEFAULT true,  -- ✅ Campo en español
    "configuracion" JSONB DEFAULT '{}',
    "ultima_ejecucion" TIMESTAMPTZ,  -- ✅ Campo en español
    "proxima_ejecucion" TIMESTAMPTZ,  -- ✅ Campo en español
    "total_ejecuciones" INTEGER DEFAULT 0,  -- ✅ Campo en español
    "ejecuciones_exitosas" INTEGER DEFAULT 0,  -- ✅ Campo en español
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "usuario" TEXT, -- ✅ Email del usuario (redundancia útil)
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE "programados" IS 'Tareas programadas y automatización de noticieros';

-- ==================================================
-- TABLA: fuentes_final
-- ✅ Catálogo global de fuentes con configuración de scraping
-- ==================================================
CREATE TABLE IF NOT EXISTS "fuentes_final" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "region" TEXT NOT NULL REFERENCES "configuraciones_regiones"("region") ON UPDATE CASCADE,
    "nombre_fuente" TEXT NOT NULL,
    "url" TEXT NOT NULL UNIQUE,  -- ✅ UNIQUE: No duplicar fuentes
    "rss_url" TEXT,  -- URL del feed RSS (si existe)
    "tipo_scraping" TEXT DEFAULT 'web' CHECK (tipo_scraping IN ('rss', 'web', 'ambos')),
    "selectores_css" JSONB DEFAULT '{
        "contenido": [],
        "titulo": [],
        "resumen": [],
        "imagen": [],
        "eliminar": []
    }',
    "requiere_js" BOOLEAN DEFAULT false,  -- ✅ NUEVO: Si requiere JavaScript para renderizar
    "usa_premium_proxy" BOOLEAN DEFAULT false,
    "estado_test" TEXT DEFAULT 'pendiente' CHECK (estado_test IN ('pendiente', 'exitoso', 'fallido')),
    "ultimo_test" TIMESTAMPTZ,
    -- ✅ Campos de scheduling y estadísticas de scraping
    "frecuencia_scraping_minutos" INTEGER DEFAULT 60,
    "ultima_ejecucion" TIMESTAMPTZ,
    "proxima_ejecucion" TIMESTAMPTZ,
    "total_scrapes" INTEGER DEFAULT 0,
    "scrapes_exitosos" INTEGER DEFAULT 0,
    "scrapes_fallidos" INTEGER DEFAULT 0,
    "tasa_exito" NUMERIC(5,2) DEFAULT 100.0,
    "esta_activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE "fuentes_final" IS 'Catálogo global de fuentes de noticias con configuración de scraping (RSS/Web/selectores CSS)';

-- ==================================================
-- TABLA: user_fuentes_suscripciones
-- ✅ NUEVA: Suscripciones de admins a fuentes
-- ==================================================
CREATE TABLE IF NOT EXISTS "user_fuentes_suscripciones" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "fuente_id" UUID NOT NULL REFERENCES "fuentes_final"("id") ON DELETE CASCADE,
    "categoria" TEXT DEFAULT 'general',  -- Categoría personalizada
    "esta_activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("user_id", "fuente_id")  -- Un usuario no puede suscribirse dos veces
);

COMMENT ON TABLE "user_fuentes_suscripciones" IS 'Suscripciones de admins a fuentes compartidas';

-- ==================================================
-- TABLA: radios
-- ✅ Con user_id para multi-tenant (cada admin tiene sus radios)
-- ==================================================
CREATE TABLE IF NOT EXISTS "radios" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nombre" TEXT NOT NULL,
    "frecuencia" TEXT NOT NULL,  -- Ej: '99.7 FM'
    "region" TEXT NOT NULL REFERENCES "configuraciones_regiones"("region") ON UPDATE CASCADE,
    "url" TEXT,
    "esta_activo" BOOLEAN DEFAULT true,
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,  -- ✅ NUEVO: Owner de la radio
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE "radios" IS 'Radios registradas por región, con ownership por admin';

-- ==================================================
-- TABLA: noticieros
-- Noticieros generados (antes news_reports)
-- ==================================================
CREATE TABLE IF NOT EXISTS "noticieros" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "titulo" TEXT NOT NULL,
    "region" TEXT REFERENCES "configuraciones_regiones"("region") ON UPDATE CASCADE,  -- ✅ Agregado: Región del noticiero
    "contenido" TEXT,
    "datos_timeline" JSONB,  -- Timeline completo
    "url_audio" TEXT,
    "s3_key" TEXT,
    "duracion_segundos" INTEGER,
    "estado" TEXT DEFAULT 'generado' CHECK (estado IN ('generado', 'procesando', 'completado', 'fallido')),
    "costo_generacion" NUMERIC(10,4) DEFAULT 0,
    "total_tokens" INTEGER DEFAULT 0,
    "metadata" JSONB DEFAULT '{}',
    "background_music_url" TEXT,  -- ✅ URL de música de fondo
    "background_music_volume" NUMERIC(3,2) DEFAULT 0.2,  -- ✅ Volumen música de fondo (0.0-1.0)
    "background_music_config" JSONB DEFAULT '{}',  -- ✅ Config: {mode: "global"|"range", fromNews?: number, toNews?: number}
    "plantilla_id" UUID REFERENCES "plantillas"("id") ON DELETE SET NULL,
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "fecha_publicacion" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE "noticieros" IS 'Noticieros generados por el sistema';

-- ==================================================
-- TABLA: noticias_scrapeadas
-- Noticias obtenidas de fuentes RSS
-- ==================================================
CREATE TABLE IF NOT EXISTS "noticias_scrapeadas" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "titulo" TEXT NOT NULL,
    "contenido" TEXT,
    "resumen" TEXT,
    "url" TEXT UNIQUE,
    "fuente" TEXT,  -- Nombre de la fuente (redundancia útil)
    "fuente_id" UUID REFERENCES "fuentes_final"("id") ON DELETE SET NULL,  -- ✅ NUEVO: Relación con fuentes_final
    "categoria" TEXT DEFAULT 'general',
    "sentimiento" TEXT DEFAULT 'neutral' CHECK (sentimiento IN ('positivo', 'negativo', 'neutral')),
    "prioridad" TEXT DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
    "region" TEXT NOT NULL REFERENCES "configuraciones_regiones"("region") ON UPDATE CASCADE,  -- ✅ NOT NULL con foreign key
    "autor" TEXT,
    "imagen_url" TEXT,
    "fecha_publicacion" TIMESTAMPTZ,
    "fecha_scraping" TIMESTAMPTZ DEFAULT NOW(),
    "fue_procesada" BOOLEAN DEFAULT false,
    "embedding" VECTOR(1536)  -- Para búsquedas semánticas
);

COMMENT ON TABLE "noticias_scrapeadas" IS 'Noticias obtenidas de RSS y web scraping';

-- ==================================================
-- TABLA: campanas_publicitarias
-- Campañas publicitarias
-- ==================================================
CREATE TABLE IF NOT EXISTS "campanas_publicitarias" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "url_audio" TEXT,
    "s3_key" TEXT,
    "duracion_segundos" INTEGER,
    "esta_activo" BOOLEAN DEFAULT true,
    "reproducciones" INTEGER DEFAULT 0,
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE "campanas_publicitarias" IS 'Campañas publicitarias para insertar en noticieros';

-- ==================================================
-- TABLA: facturas (invoices)
-- Sistema de facturación
-- ==================================================
CREATE TABLE IF NOT EXISTS "facturas" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "numero_factura" TEXT UNIQUE NOT NULL,
    "monto" NUMERIC(10,2) NOT NULL,
    "impuesto" NUMERIC(10,2) DEFAULT 0,
    "total" NUMERIC(10,2) NOT NULL,
    "moneda" TEXT DEFAULT 'CLP',
    "estado" TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador', 'enviada', 'pagada', 'vencida')),
    "fecha_vencimiento" DATE,
    "fecha_pago" TIMESTAMPTZ,
    "datos_facturacion" JSONB DEFAULT '{}',
    "url_pdf" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE "facturas" IS 'Facturas generadas para usuarios';

-- ==================================================
-- TABLA: uso_tokens
-- Tracking de costos y uso de APIs
-- ==================================================
CREATE TABLE IF NOT EXISTS "uso_tokens" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "servicio" TEXT NOT NULL,  -- openai, elevenlabs, azure, chutes, local-tts
    "operacion" TEXT NOT NULL,  -- tts, procesamiento_texto, scraping
    "tokens_usados" INTEGER DEFAULT 0,
    "costo" NUMERIC(10,4) DEFAULT 0,
    "moneda" TEXT DEFAULT 'USD',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE "uso_tokens" IS 'Registro de uso de tokens y costos por usuario';

-- ==================================================
-- TABLA: metricas_diarias
-- Métricas agregadas por día
-- ==================================================
CREATE TABLE IF NOT EXISTS "metricas_diarias" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "fecha" DATE UNIQUE NOT NULL,
    "total_noticieros" INTEGER DEFAULT 0,
    "costo_total" NUMERIC(10,4) DEFAULT 0,
    "total_tokens" INTEGER DEFAULT 0,
    "usuarios_activos" INTEGER DEFAULT 0,
    "tasa_exito_scraping" NUMERIC(3,2) DEFAULT 1.0,
    "tiempo_promedio_procesamiento" INTEGER,  -- segundos
    "datos_metricas" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE "metricas_diarias" IS 'Métricas diarias del sistema';

-- ==================================================
-- TABLA: logs_procesamiento
-- Logs de procesos de generación
-- ==================================================
CREATE TABLE IF NOT EXISTS "logs_procesamiento" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "noticiero_id" UUID REFERENCES "noticieros"("id") ON DELETE CASCADE,
    "tipo_proceso" TEXT NOT NULL CHECK (tipo_proceso IN ('scraping', 'procesamiento', 'tts', 'ensamblaje')),
    "estado" TEXT NOT NULL CHECK (estado IN ('iniciado', 'completado', 'fallido')),
    "inicio" TIMESTAMPTZ DEFAULT NOW(),
    "fin" TIMESTAMPTZ,
    "duracion_segundos" INTEGER,
    "mensaje_error" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "tokens_usados" INTEGER DEFAULT 0,
    "costo" NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE "logs_procesamiento" IS 'Logs de procesos de generación de noticieros';

-- ==================================================
-- TABLA: logs_scraping
-- ✅ NUEVO: Logs específicos de scraping con métricas
-- ==================================================
CREATE TABLE IF NOT EXISTS "logs_scraping" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "fuente_id" UUID REFERENCES "fuentes_final"("id") ON DELETE SET NULL,
    "region" TEXT NOT NULL,
    "estado" TEXT NOT NULL CHECK (estado IN ('exitoso', 'fallido', 'parcial')),
    "noticias_encontradas" INTEGER DEFAULT 0,
    "noticias_nuevas" INTEGER DEFAULT 0,
    "noticias_duplicadas" INTEGER DEFAULT 0,
    "tiempo_ejecucion_ms" INTEGER,
    "metodo_scraping" TEXT,  -- 'scrapingbee', 'rss', 'direct'
    "scrapingbee_credits_usados" INTEGER DEFAULT 0,
    "costo_estimado_usd" NUMERIC(10,6) DEFAULT 0,
    "requests_realizados" INTEGER DEFAULT 0,
    "bytes_descargados" INTEGER DEFAULT 0,
    "mensaje_error" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_logs_scraping_fuente_id" ON "logs_scraping"("fuente_id");
CREATE INDEX IF NOT EXISTS "idx_logs_scraping_created_at" ON "logs_scraping"("created_at");
CREATE INDEX IF NOT EXISTS "idx_logs_scraping_estado" ON "logs_scraping"("estado");

COMMENT ON TABLE "logs_scraping" IS 'Logs detallados de ejecuciones de scraping con métricas de costos';

-- ==================================================
-- TABLA: configuraciones_regiones
-- Configuraciones específicas por región
-- ==================================================
CREATE TABLE IF NOT EXISTS "configuraciones_regiones" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "region" TEXT UNIQUE NOT NULL,
    "zona_horaria" TEXT DEFAULT 'America/Santiago',
    "clima_habilitado" BOOLEAN DEFAULT true,
    "proveedor_voz_default" TEXT DEFAULT 'local-tts',
    "voz_id_default" TEXT DEFAULT 'default',
    "fuentes_scraping" JSONB DEFAULT '[]',
    "frecuencia_anuncios" INTEGER DEFAULT 2,
    "max_noticias_por_reporte" INTEGER DEFAULT 10,
    "esta_activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE "configuraciones_regiones" IS 'Configuraciones por región de Chile';

-- ==================================================
-- TABLA: cola_tareas
-- Queue para procesos asíncronos
-- ==================================================
CREATE TABLE IF NOT EXISTS "cola_tareas" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tipo_tarea" TEXT NOT NULL CHECK (tipo_tarea IN ('generar_noticiero', 'scrapear_noticias', 'procesar_audio')),
    "prioridad" INTEGER DEFAULT 5 CHECK (prioridad BETWEEN 1 AND 10),
    "estado" TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'procesando', 'completado', 'fallido')),
    "payload" JSONB NOT NULL,
    "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "intentos" INTEGER DEFAULT 0,
    "max_intentos" INTEGER DEFAULT 3,
    "programado_para" TIMESTAMPTZ DEFAULT NOW(),
    "inicio" TIMESTAMPTZ,
    "fin" TIMESTAMPTZ,
    "mensaje_error" TEXT,
    "resultado" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE "cola_tareas" IS 'Cola de tareas asíncronas del sistema';

-- ==================================================
-- TABLA: system_config
-- Configuraciones globales del sistema (SUPER_ADMIN)
-- ==================================================
CREATE TABLE IF NOT EXISTS "system_config" (
    "key" TEXT PRIMARY KEY,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_by" UUID REFERENCES "users"("id") ON DELETE SET NULL
);

COMMENT ON TABLE "system_config" IS 'Configuraciones globales del sistema, modificables por SUPER_ADMIN';

-- Valores iniciales
INSERT INTO "system_config" ("key", "value", "description")
VALUES 
    ('auto_clean_days', '2', 'Días antes de eliminar noticias scrapeadas (2, 3, 5, 7)'),
    ('cleanup_enabled', 'true', 'Habilitar limpieza automática de noticias'),
    ('last_cleanup_at', 'never', 'Fecha/hora de última limpieza ejecutada')
ON CONFLICT ("key") DO NOTHING;

-- ==================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ==================================================

-- Users
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users"("role");
CREATE INDEX IF NOT EXISTS "idx_users_is_active" ON "users"("is_active");
CREATE INDEX IF NOT EXISTS "idx_users_admin_id" ON "users"("admin_id");  -- ✅ NUEVO: Para jerarquía multi-tenant

-- Biblioteca Audio
CREATE INDEX IF NOT EXISTS "idx_biblioteca_audio_tipo" ON "biblioteca_audio"("tipo");
CREATE INDEX IF NOT EXISTS "idx_biblioteca_audio_user_id" ON "biblioteca_audio"("user_id");
CREATE INDEX IF NOT EXISTS "idx_biblioteca_audio_is_active" ON "biblioteca_audio"("is_active");

-- Plantillas
CREATE INDEX IF NOT EXISTS "idx_plantillas_user_id" ON "plantillas"("user_id");
CREATE INDEX IF NOT EXISTS "idx_plantillas_region" ON "plantillas"("region");

-- Programados
CREATE INDEX IF NOT EXISTS "idx_programados_user_id" ON "programados"("user_id");
CREATE INDEX IF NOT EXISTS "idx_programados_tipo" ON "programados"("tipo");
CREATE INDEX IF NOT EXISTS "idx_programados_esta_activo" ON "programados"("esta_activo");
CREATE INDEX IF NOT EXISTS "idx_programados_proxima_ejecucion" ON "programados"("proxima_ejecucion");

-- Noticieros
CREATE INDEX IF NOT EXISTS "idx_noticieros_user_id" ON "noticieros"("user_id");
CREATE INDEX IF NOT EXISTS "idx_noticieros_created_at" ON "noticieros"("created_at");
CREATE INDEX IF NOT EXISTS "idx_noticieros_estado" ON "noticieros"("estado");
CREATE INDEX IF NOT EXISTS "idx_noticieros_plantilla_id" ON "noticieros"("plantilla_id");

-- Noticias Scrapeadas
CREATE INDEX IF NOT EXISTS "idx_noticias_scrapeadas_fecha_publicacion" ON "noticias_scrapeadas"("fecha_publicacion");
CREATE INDEX IF NOT EXISTS "idx_noticias_scrapeadas_region" ON "noticias_scrapeadas"("region");
CREATE INDEX IF NOT EXISTS "idx_noticias_scrapeadas_categoria" ON "noticias_scrapeadas"("categoria");
CREATE INDEX IF NOT EXISTS "idx_noticias_scrapeadas_fue_procesada" ON "noticias_scrapeadas"("fue_procesada");

-- Uso Tokens
CREATE INDEX IF NOT EXISTS "idx_uso_tokens_user_id" ON "uso_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "idx_uso_tokens_created_at" ON "uso_tokens"("created_at");
CREATE INDEX IF NOT EXISTS "idx_uso_tokens_servicio" ON "uso_tokens"("servicio");

-- Logs Procesamiento
CREATE INDEX IF NOT EXISTS "idx_logs_procesamiento_user_id" ON "logs_procesamiento"("user_id");
CREATE INDEX IF NOT EXISTS "idx_logs_procesamiento_noticiero_id" ON "logs_procesamiento"("noticiero_id");
CREATE INDEX IF NOT EXISTS "idx_logs_procesamiento_tipo_proceso" ON "logs_procesamiento"("tipo_proceso");
CREATE INDEX IF NOT EXISTS "idx_logs_procesamiento_estado" ON "logs_procesamiento"("estado");

-- Cola Tareas
CREATE INDEX IF NOT EXISTS "idx_cola_tareas_estado" ON "cola_tareas"("estado");
CREATE INDEX IF NOT EXISTS "idx_cola_tareas_tipo_tarea" ON "cola_tareas"("tipo_tarea");
CREATE INDEX IF NOT EXISTS "idx_cola_tareas_prioridad" ON "cola_tareas"("prioridad");
CREATE INDEX IF NOT EXISTS "idx_cola_tareas_programado_para" ON "cola_tareas"("programado_para");

-- Facturas  
CREATE INDEX IF NOT EXISTS "idx_facturas_user_id" ON "facturas"("user_id");
CREATE INDEX IF NOT EXISTS "idx_facturas_estado" ON "facturas"("estado");
CREATE INDEX IF NOT EXISTS "idx_facturas_created_at" ON "facturas"("created_at");

-- ==================================================
-- TRIGGERS PARA UPDATED_AT
-- ==================================================

CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Aplicar triggers
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
CREATE TRIGGER trigger_biblioteca_audio_updated_at BEFORE UPDATE ON "biblioteca_audio" FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
CREATE TRIGGER trigger_plantillas_updated_at BEFORE UPDATE ON "plantillas" FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
CREATE TRIGGER trigger_programados_updated_at BEFORE UPDATE ON "programados" FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
CREATE TRIGGER trigger_noticieros_updated_at BEFORE UPDATE ON "noticieros" FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
CREATE TRIGGER trigger_campanas_publicitarias_updated_at BEFORE UPDATE ON "campanas_publicitarias" FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
CREATE TRIGGER trigger_facturas_updated_at BEFORE UPDATE ON "facturas" FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
CREATE TRIGGER trigger_configuraciones_regiones_updated_at BEFORE UPDATE ON "configuraciones_regiones" FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
CREATE TRIGGER trigger_system_config_updated_at BEFORE UPDATE ON "system_config" FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

-- ==================================================
-- ROW LEVEL SECURITY (RLS)
-- ==================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "biblioteca_audio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plantillas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "programados" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fuentes_final" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "radios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "noticieros" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "noticias_scrapeadas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campanas_publicitarias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "facturas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "system_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "uso_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "metricas_diarias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "logs_procesamiento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "logs_scraping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "configuraciones_regiones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cola_tareas" ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para desarrollo (permitir todo a usuarios autenticados)
CREATE POLICY "Acceso completo para autenticados" ON "users" FOR ALL USING (true);
CREATE POLICY "Acceso completo para autenticados" ON "biblioteca_audio" FOR ALL USING (true);
CREATE POLICY "Acceso completo para autenticados" ON "plantillas" FOR ALL USING (true);
CREATE POLICY "Acceso completo para autenticados" ON "programados" FOR ALL USING (true);
CREATE POLICY "Acceso completo para autenticados" ON "fuentes_final" FOR ALL USING (true);
CREATE POLICY "Acceso completo para autenticados" ON "radios" FOR ALL USING (true);
CREATE POLICY "Acceso completo para autenticados" ON "noticieros" FOR ALL USING (true);
CREATE POLICY "Acceso completo para autenticados" ON "noticias_scrapeadas" FOR ALL USING (true);
CREATE POLICY "Acceso completo para autenticados" ON "campanas_publicitarias" FOR ALL USING (true);
CREATE POLICY "Acceso completo para autenticados" ON "facturas" FOR ALL USING (true);
CREATE POLICY "Acceso completo para autenticados" ON "uso_tokens" FOR ALL USING (true);
CREATE POLICY "Acceso completo para autenticados" ON "metricas_diarias" FOR ALL USING (true);
CREATE POLICY "Acceso completo para autenticados" ON "logs_procesamiento" FOR ALL USING (true);
CREATE POLICY "Acceso completo para autenticados" ON "logs_scraping" FOR ALL USING (true);
CREATE POLICY "Acceso completo para autenticados" ON "configuraciones_regiones" FOR ALL USING (true);
CREATE POLICY "Acceso completo para autenticados" ON "cola_tareas" FOR ALL USING (true);
CREATE POLICY "Acceso completo para autenticados" ON "system_config" FOR ALL USING (true);

-- Políticas de lectura para anónimos (solo lectura en tablas públicas)
CREATE POLICY "Lectura para anónimos" ON "biblioteca_audio" FOR SELECT USING (true);
CREATE POLICY "Lectura para anónimos" ON "fuentes_final" FOR SELECT USING (true);
CREATE POLICY "Lectura para anónimos" ON "radios" FOR SELECT USING (true);
CREATE POLICY "Lectura para anónimos" ON "configuraciones_regiones" FOR SELECT USING (true);

-- ==================================================
-- DATOS INICIALES
-- ==================================================

-- Insertar regiones chilenas
INSERT INTO "configuraciones_regiones" ("region", "esta_activo") VALUES
('Arica y Parinacota', true),
('Tarapacá', true),
('Antofagasta', true),
('Atacama', true),
('Coquimbo', true),
('Valparaíso', true),
('Metropolitana de Santiago', true),
('O''Higgins', true),
('Maule', true),
('Ñuble', true),
('Biobío', true),
('La Araucanía', true),
('Los Ríos', true),
('Los Lagos', true),
('Aysén', true),
('Magallanes y Antártica Chilena', true),
('Nacional', true)
ON CONFLICT (region) DO NOTHING;

-- Insertar usuario administrador de ejemplo (CON PASSWORD HASH)
-- Nota: Cambiar password en producción
INSERT INTO "users" ("email", "password_hash", "nombre_completo", "role", "is_active") VALUES
('admin@vira.cl', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Administrador VIRA', 'admin', true)
-- Password hash de ejemplo: "admin123" (⚠️ CAMBIAR EN PRODUCCIÓN)
ON CONFLICT (email) DO NOTHING;

-- ==================================================
-- CATÁLOGO INICIAL DE FUENTES CHILENAS
-- ==================================================

-- Fuentes Nacionales
INSERT INTO "fuentes_final" ("region", "nombre_fuente", "url", "rss_url", "tipo_scraping", "selectores_css", "estado_test") VALUES
('Nacional', 'Emol', 'https://www.emol.com', NULL, 'web', '{
    "contenido": ["#cuDetalle_cuTexto_uc498", ".EmolText", "#texto_noticia"],
    "titulo": ["h1.titulo"],
    "imagen": ["meta[property=''og:image'']"],
    "eliminar": [".ads", "nav", "footer", ".sidebar", ".relacionadas"]
}', 'exitoso'),
('Nacional', 'BioBioChile', 'https://www.biobiochile.cl', 'https://www.biobiochile.cl/rss/category/noticias/nacional.xml', 'ambos', '{
    "contenido": [".article-content", ".nota-content", ".entry-content"],
    "eliminar": [".ads", ".sidebar", "nav", "footer"]
}', 'pendiente'),
('Nacional', 'Cooperativa', 'https://www.cooperativa.cl', 'https://www.cooperativa.cl/noticias/rss/site.xml', 'rss', '{}', 'pendiente'),
('Nacional', 'La Tercera', 'https://www.latercera.com', NULL, 'web', '{
    "contenido": [".single-content", ".article-body-content"],
    "eliminar": [".ads", "nav", "footer"]
}', 'pendiente'),
('Nacional', '24 Horas', 'https://www.24horas.cl', NULL, 'web', '{
    "contenido": [".article-body", ".nota-content"],
    "eliminar": [".ads", "nav", "footer"]
}', 'pendiente'),
('Nacional', 'CHV Noticias', 'https://www.chvnoticias.cl', NULL, 'web', '{
    "contenido": [".article-body", ".entry-content"],
    "eliminar": [".ads", "nav", "footer"]
}', 'pendiente')
ON CONFLICT (url) DO NOTHING;

-- Fuentes Regionales - Ñuble
INSERT INTO "fuentes_final" ("region", "nombre_fuente", "url", "rss_url", "tipo_scraping", "selectores_css", "estado_test") VALUES
('Ñuble', 'La Discusión', 'https://ladiscusion.cl', 'https://ladiscusion.cl/feed/', 'rss', '{}', 'exitoso'),
('Ñuble', 'SoyChillan', 'https://www.soychile.cl/chillan', NULL, 'web', '{
    "contenido": [".article-body", ".nota-cuerpo", ".content-article"],
    "eliminar": [".ads", "nav", "footer", ".menu"]
}', 'fallido')
ON CONFLICT (url) DO NOTHING;

-- Fuentes Regionales - Biobío
INSERT INTO "fuentes_final" ("region", "nombre_fuente", "url", "rss_url", "tipo_scraping", "selectores_css", "estado_test") VALUES
('Biobío', 'El Sur', 'https://www.elsur.cl', NULL, 'web', '{
    "contenido": [".article-body", ".entry-content"],
    "eliminar": [".ads", "nav", "footer"]
}', 'pendiente'),
('Biobío', 'Radio BioBío Concepción', 'https://www.radiobiobio.cl', NULL, 'web', '{
    "contenido": [".article-body", ".nota-content"],
    "eliminar": [".ads", "nav", "footer"]
}', 'pendiente')
ON CONFLICT (url) DO NOTHING;

-- ==================================================
-- TABLA: scraping_cache
-- Cache de escaneos de páginas principales (preview)
-- Para ahorrar créditos de ScrapingBee
-- ==================================================
CREATE TABLE IF NOT EXISTS "scraping_cache" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "fuente_id" UUID REFERENCES "fuentes_final"("id") ON DELETE CASCADE,
    "fuente_url" TEXT NOT NULL UNIQUE,
    "noticias" JSONB NOT NULL DEFAULT '[]',  -- [{titulo, url, categoria, fecha_publicacion}]
    "categorias_conteo" JSONB DEFAULT '{}',   -- {"Política": 5, "Deportes": 3}
    "total_noticias" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "expires_at" TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_scraping_cache_url ON "scraping_cache"("fuente_url");
CREATE INDEX IF NOT EXISTS idx_scraping_cache_expires ON "scraping_cache"("expires_at");

COMMENT ON TABLE "scraping_cache" IS 'Cache de escaneos de páginas principales para ahorrar créditos ScrapingBee';
COMMENT ON COLUMN "scraping_cache"."noticias" IS 'Array JSON con noticias encontradas: [{titulo, url, categoria, fecha_publicacion}]';
COMMENT ON COLUMN "scraping_cache"."expires_at" IS 'Fecha de expiración del cache (24 horas por defecto)';

-- ==================================================
-- FIN DEL SCHEMA
-- ==================================================
