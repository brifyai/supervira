-- ==================================================
-- SCRIPT DE HARD RESET (BORRADO TOTAL Y RECREACIÓN)
-- ==================================================
-- ADVERTENCIA: ESTE SCRIPT BORRA TODOS LOS DATOS
-- ==================================================

-- 1. Eliminar esquema público completo (y recrearlo limpio)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Restaurar permisos por defecto
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- 2. Aplicar Schema Definitivo (Copiado de schema_final.sql)

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Tabla Users
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" TEXT UNIQUE NOT NULL,
    "password_hash" TEXT,
    "nombre_completo" TEXT,
    "email_verified" TIMESTAMPTZ,
    "image" TEXT,
    "role" TEXT DEFAULT 'user' CHECK (role IN ('admin', 'operator', 'user')),
    "is_active" BOOLEAN DEFAULT true,
    "last_login" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla Biblioteca Audio
CREATE TABLE "biblioteca_audio" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nombre" TEXT NOT NULL,
    "audio" TEXT,
    "tipo" TEXT NOT NULL CHECK (tipo IN ('voz', 'musica', 'efecto', 'jingle', 'cortina', 'intro', 'outro')),
    "genero" TEXT CHECK (genero IN ('masculino', 'femenino', 'neutro')),
    "idioma" TEXT DEFAULT 'español',
    "duracion" TEXT,
    "duration_seconds" INTEGER,
    "descripcion" TEXT,
    "category" TEXT,
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

-- Tabla Plantillas
CREATE TABLE "plantillas" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "region" TEXT NOT NULL,
    "radio_station" TEXT,
    "duracion_minutos" INTEGER DEFAULT 15,
    "voz_proveedor" TEXT DEFAULT 'local-tts',
    "voz_id" TEXT DEFAULT 'default',
    "incluir_clima" BOOLEAN DEFAULT true,
    "incluir_hora" BOOLEAN DEFAULT true,
    "frecuencia_anuncios" INTEGER DEFAULT 2,
    "categorias" JSONB DEFAULT '[]',
    "configuracion" JSONB DEFAULT '{}',
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla Programados
CREATE TABLE "programados" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL CHECK (tipo IN ('noticiero', 'publicacion_social', 'scraping')),
    "horario" TEXT,
    "esta_activo" BOOLEAN DEFAULT true,
    "configuracion" JSONB DEFAULT '{}',
    "ultima_ejecucion" TIMESTAMPTZ,
    "proxima_ejecucion" TIMESTAMPTZ,
    "total_ejecuciones" INTEGER DEFAULT 0,
    "ejecuciones_exitosas" INTEGER DEFAULT 0,
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla Fuentes Final
CREATE TABLE "fuentes_final" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nombre" TEXT NOT NULL,
    "nombre_fuente" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "rss_url" TEXT,
    "esta_activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla Radios
CREATE TABLE "radios" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nombre" TEXT NOT NULL,
    "frecuencia" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "url" TEXT,
    "esta_activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla Noticieros
CREATE TABLE "noticieros" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "titulo" TEXT NOT NULL,
    "contenido" TEXT,
    "datos_timeline" JSONB,
    "url_audio" TEXT,
    "s3_key" TEXT,
    "duracion_segundos" INTEGER,
    "estado" TEXT DEFAULT 'generado' CHECK (estado IN ('generado', 'procesando', 'completado', 'fallido')),
    "costo_generacion" NUMERIC(10,4) DEFAULT 0,
    "total_tokens" INTEGER DEFAULT 0,
    "metadata" JSONB DEFAULT '{}',
    "plantilla_id" UUID REFERENCES "plantillas"("id") ON DELETE SET NULL,
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "fecha_publicacion" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla Noticias Scrapeadas
CREATE TABLE "noticias_scrapeadas" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "titulo" TEXT NOT NULL,
    "contenido" TEXT,
    "resumen" TEXT,
    "url" TEXT UNIQUE,
    "fuente" TEXT,
    "categoria" TEXT DEFAULT 'general',
    "sentimiento" TEXT DEFAULT 'neutral',
    "prioridad" TEXT DEFAULT 'media',
    "region" TEXT,
    "autor" TEXT,
    "imagen_url" TEXT,
    "fecha_publicacion" TIMESTAMPTZ,
    "fecha_scraping" TIMESTAMPTZ DEFAULT NOW(),
    "fue_procesada" BOOLEAN DEFAULT false,
    "embedding" VECTOR(1536)
);

-- Tabla Campañas Publicitarias
CREATE TABLE "campanas_publicitarias" (
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

-- Tabla Facturas
CREATE TABLE "facturas" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "numero_factura" TEXT UNIQUE NOT NULL,
    "monto" NUMERIC(10,2) NOT NULL,
    "impuesto" NUMERIC(10,2) DEFAULT 0,
    "total" NUMERIC(10,2) NOT NULL,
    "moneda" TEXT DEFAULT 'CLP',
    "estado" TEXT DEFAULT 'borrador',
    "fecha_vencimiento" DATE,
    "fecha_pago" TIMESTAMPTZ,
    "datos_facturacion" JSONB DEFAULT '{}',
    "url_pdf" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla Uso Tokens
CREATE TABLE "uso_tokens" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "servicio" TEXT NOT NULL,
    "operacion" TEXT NOT NULL,
    "tokens_usados" INTEGER DEFAULT 0,
    "costo" NUMERIC(10,4) DEFAULT 0,
    "moneda" TEXT DEFAULT 'USD',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla Metricas Diarias
CREATE TABLE "metricas_diarias" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "fecha" DATE UNIQUE NOT NULL,
    "total_noticieros" INTEGER DEFAULT 0,
    "costo_total" NUMERIC(10,4) DEFAULT 0,
    "total_tokens" INTEGER DEFAULT 0,
    "usuarios_activos" INTEGER DEFAULT 0,
    "tasa_exito_scraping" NUMERIC(3,2) DEFAULT 1.0,
    "tiempo_promedio_procesamiento" INTEGER,
    "datos_metricas" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla Logs Procesamiento
CREATE TABLE "logs_procesamiento" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "noticiero_id" UUID REFERENCES "noticieros"("id") ON DELETE CASCADE,
    "tipo_proceso" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "inicio" TIMESTAMPTZ DEFAULT NOW(),
    "fin" TIMESTAMPTZ,
    "duracion_segundos" INTEGER,
    "mensaje_error" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "tokens_usados" INTEGER DEFAULT 0,
    "costo" NUMERIC(10,4) DEFAULT 0
);

-- Tabla Configuraciones Regiones
CREATE TABLE "configuraciones_regiones" (
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

-- Tabla Cola Tareas
CREATE TABLE "cola_tareas" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tipo_tarea" TEXT NOT NULL,
    "prioridad" INTEGER DEFAULT 5,
    "estado" TEXT DEFAULT 'pendiente',
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

-- RLS Policies (Permisivas para dev)
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "users" FOR ALL USING (true);

ALTER TABLE "biblioteca_audio" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "biblioteca_audio" FOR ALL USING (true);

ALTER TABLE "plantillas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "plantillas" FOR ALL USING (true);

ALTER TABLE "programados" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "programados" FOR ALL USING (true);

ALTER TABLE "noticieros" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "noticieros" FOR ALL USING (true);

ALTER TABLE "noticias_scrapeadas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "noticias_scrapeadas" FOR ALL USING (true);

ALTER TABLE "fuentes_final" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "fuentes_final" FOR ALL USING (true);

ALTER TABLE "radios" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "radios" FOR ALL USING (true);

-- Datos Iniciales
INSERT INTO "configuraciones_regiones" ("region", "esta_activo") VALUES
('Arica y Parinacota', true), ('Tarapacá', true), ('Antofagasta', true), ('Atacama', true), 
('Coquimbo', true), ('Valparaíso', true), ('Metropolitana de Santiago', true), ('O''Higgins', true), 
('Maule', true), ('Ñuble', true), ('Biobío', true), ('La Araucanía', true), ('Los Ríos', true), 
('Los Lagos', true), ('Aysén', true), ('Magallanes y Antártica Chilena', true), ('Nacional', true)
ON CONFLICT (region) DO NOTHING;

INSERT INTO "fuentes_final" ("nombre", "nombre_fuente", "url", "rss_url") VALUES
('Nacional', 'Emol', 'https://www.emol.com', 'https://www.emol.com/rss/rss.asp'),
('Nacional', 'La Tercera', 'https://www.latercera.com', 'https://www.latercera.com/feed/'),
('Nacional', 'BioBioChile', 'https://www.biobiochile.cl', 'https://www.biobiochile.cl/especial/rss/index.xml')
ON CONFLICT DO NOTHING;

INSERT INTO "users" ("email", "password_hash", "nombre_completo", "role", "is_active") VALUES
('admin@vira.cl', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Administrador VIRA', 'admin', true);
