-- ============================================
-- VIRA - Schema Completo de Base de Datos
-- Exportado desde Supabase
-- Fecha: 2025-12-15T03:18:30.928Z
-- Proyecto: xpkwgsabpvqrgqbukptx
-- ============================================

-- ============================================
-- EXTENSIONES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- --------------------------------------------
-- Tabla: biblioteca_audio
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.biblioteca_audio (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL,
    audio text,
    tipo text NOT NULL,
    genero text,
    idioma text DEFAULT 'español'::text,
    duracion text,
    duration_seconds integer,
    descripcion text,
    category text,
    s3_key text,
    volume_level numeric DEFAULT 1.0,
    fade_in integer DEFAULT 0,
    fade_out integer DEFAULT 0,
    reproductions integer DEFAULT 0,
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    usuario text
);

-- --------------------------------------------
-- Tabla: campanas_publicitarias
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.campanas_publicitarias (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL,
    descripcion text,
    url_audio text,
    s3_key text,
    duracion_segundos integer,
    esta_activo boolean DEFAULT true,
    reproducciones integer DEFAULT 0,
    fecha_inicio date,
    fecha_fin date,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- --------------------------------------------
-- Tabla: cola_tareas
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.cola_tareas (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    tipo_tarea text NOT NULL,
    prioridad integer DEFAULT 5,
    estado text DEFAULT 'pendiente'::text,
    payload jsonb NOT NULL,
    user_id uuid,
    intentos integer DEFAULT 0,
    max_intentos integer DEFAULT 3,
    programado_para timestamp with time zone DEFAULT now(),
    inicio timestamp with time zone,
    fin timestamp with time zone,
    mensaje_error text,
    resultado jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- --------------------------------------------
-- Tabla: configuraciones_regiones
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.configuraciones_regiones (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    region text NOT NULL,
    zona_horaria text DEFAULT 'America/Santiago'::text,
    clima_habilitado boolean DEFAULT true,
    proveedor_voz_default text DEFAULT 'local-tts'::text,
    voz_id_default text DEFAULT 'default'::text,
    fuentes_scraping jsonb DEFAULT '[]'::jsonb,
    frecuencia_anuncios integer DEFAULT 2,
    max_noticias_por_reporte integer DEFAULT 10,
    esta_activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- --------------------------------------------
-- Tabla: facturas
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.facturas (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL,
    numero_factura text NOT NULL,
    monto numeric NOT NULL,
    impuesto numeric DEFAULT 0,
    total numeric NOT NULL,
    moneda text DEFAULT 'CLP'::text,
    estado text DEFAULT 'borrador'::text,
    fecha_vencimiento date,
    fecha_pago timestamp with time zone,
    datos_facturacion jsonb DEFAULT '{}'::jsonb,
    url_pdf text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- --------------------------------------------
-- Tabla: fuentes_final
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.fuentes_final (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    region text NOT NULL,
    nombre_fuente text NOT NULL,
    url text NOT NULL,
    rss_url text,
    esta_activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    frecuencia_scraping_minutos integer DEFAULT 60,
    ultima_ejecucion timestamp with time zone,
    proxima_ejecucion timestamp with time zone,
    total_scrapes integer DEFAULT 0,
    scrapes_exitosos integer DEFAULT 0,
    scrapes_fallidos integer DEFAULT 0,
    tasa_exito numeric DEFAULT 100.0,
    requiere_js boolean DEFAULT false,
    tipo_scraping text DEFAULT 'web'::text,
    selectores_css jsonb DEFAULT "'{""imagen"": [], ""titulo"": [], ""resumen"": [], ""eliminar"": [], ""contenido"": []}'::jsonb",
    usa_premium_proxy boolean DEFAULT false,
    estado_test text DEFAULT 'pendiente'::text,
    ultimo_test timestamp with time zone
);

-- --------------------------------------------
-- Tabla: logs_procesamiento
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.logs_procesamiento (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid,
    noticiero_id uuid,
    tipo_proceso text NOT NULL,
    estado text NOT NULL,
    inicio timestamp with time zone DEFAULT now(),
    fin timestamp with time zone,
    duracion_segundos integer,
    mensaje_error text,
    metadata jsonb DEFAULT '{}'::jsonb,
    tokens_usados integer DEFAULT 0,
    costo numeric DEFAULT 0
);

-- --------------------------------------------
-- Tabla: logs_scraping
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.logs_scraping (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    fuente_id uuid,
    region text NOT NULL,
    estado text NOT NULL,
    noticias_encontradas integer DEFAULT 0,
    noticias_nuevas integer DEFAULT 0,
    noticias_duplicadas integer DEFAULT 0,
    tiempo_ejecucion_ms integer,
    metodo_scraping text,
    scrapingbee_credits_usados integer DEFAULT 0,
    costo_estimado_usd numeric DEFAULT 0,
    requests_realizados integer DEFAULT 0,
    bytes_descargados integer DEFAULT 0,
    mensaje_error text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- --------------------------------------------
-- Tabla: metricas_diarias
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.metricas_diarias (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    fecha date NOT NULL,
    total_noticieros integer DEFAULT 0,
    costo_total numeric DEFAULT 0,
    total_tokens integer DEFAULT 0,
    usuarios_activos integer DEFAULT 0,
    tasa_exito_scraping numeric DEFAULT 1.0,
    tiempo_promedio_procesamiento integer,
    datos_metricas jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- --------------------------------------------
-- Tabla: noticias_scrapeadas
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.noticias_scrapeadas (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    titulo text NOT NULL,
    contenido text,
    resumen text,
    url text,
    fuente text,
    categoria text DEFAULT 'general'::text,
    sentimiento text DEFAULT 'neutral'::text,
    prioridad text DEFAULT 'media'::text,
    region text NOT NULL,
    autor text,
    imagen_url text,
    fecha_publicacion timestamp with time zone,
    fecha_scraping timestamp with time zone DEFAULT now(),
    fue_procesada boolean DEFAULT false,
    embedding USER-DEFINED,
    fuente_id uuid
);

-- --------------------------------------------
-- Tabla: noticieros
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.noticieros (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    titulo text NOT NULL,
    contenido text,
    datos_timeline jsonb,
    url_audio text,
    s3_key text,
    duracion_segundos integer,
    estado text DEFAULT 'generado'::text,
    costo_generacion numeric DEFAULT 0,
    total_tokens integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    plantilla_id uuid,
    user_id uuid,
    fecha_publicacion timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    region text,
    background_music_url text,
    background_music_volume numeric DEFAULT 0.2,
    background_music_config jsonb DEFAULT '{}'::jsonb
);

-- --------------------------------------------
-- Tabla: plantillas
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.plantillas (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL,
    descripcion text,
    region text NOT NULL,
    radio_station text,
    duracion_minutos integer DEFAULT 15,
    voz_proveedor text DEFAULT 'local-tts'::text,
    voz_id text DEFAULT 'default'::text,
    incluir_clima boolean DEFAULT true,
    incluir_hora boolean DEFAULT true,
    frecuencia_anuncios integer DEFAULT 2,
    categorias jsonb DEFAULT '[]'::jsonb,
    configuracion jsonb DEFAULT '{}'::jsonb,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    audio_config jsonb DEFAULT "'{""cortinas_enabled"": false, ""cortina_default_id"": null, ""cortinas_frequency"": 3, ""background_music_id"": null, ""background_music_volume"": 0.2, ""background_music_enabled"": false}'::jsonb"
);

-- --------------------------------------------
-- Tabla: programados
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.programados (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL,
    tipo text NOT NULL,
    horario text,
    esta_activo boolean DEFAULT true,
    configuracion jsonb DEFAULT '{}'::jsonb,
    ultima_ejecucion timestamp with time zone,
    proxima_ejecucion timestamp with time zone,
    total_ejecuciones integer DEFAULT 0,
    ejecuciones_exitosas integer DEFAULT 0,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    usuario text
);

-- --------------------------------------------
-- Tabla: radios
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.radios (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL,
    frecuencia text NOT NULL,
    region text NOT NULL,
    url text,
    esta_activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid
);

-- --------------------------------------------
-- Tabla: scraping_cache
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.scraping_cache (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    fuente_id uuid,
    fuente_url text NOT NULL,
    noticias jsonb NOT NULL DEFAULT '[]'::jsonb,
    categorias_conteo jsonb DEFAULT '{}'::jsonb,
    total_noticias integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval)
);

-- --------------------------------------------
-- Tabla: system_config
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_config (
    key text NOT NULL,
    value text NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);

-- --------------------------------------------
-- Tabla: user_fuentes_suscripciones
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_fuentes_suscripciones (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL,
    fuente_id uuid NOT NULL,
    categoria text DEFAULT 'general'::text,
    esta_activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- --------------------------------------------
-- Tabla: users
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    email text NOT NULL,
    password_hash text,
    nombre_completo text,
    email_verified timestamp with time zone,
    image text,
    role text DEFAULT 'user'::text,
    is_active boolean DEFAULT true,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    admin_id uuid,
    company text DEFAULT 'VIRA'::text
);

-- --------------------------------------------
-- Tabla: uso_tokens
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.uso_tokens (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid,
    servicio text NOT NULL,
    operacion text NOT NULL,
    tokens_usados integer DEFAULT 0,
    costo numeric DEFAULT 0,
    moneda text DEFAULT 'USD'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- --------------------------------------------
-- Tabla: v_metricas_scraping_mensual
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.v_metricas_scraping_mensual (
    mes timestamp with time zone,
    region text,
    metodo_scraping text,
    total_ejecuciones bigint,
    exitosos bigint,
    fallidos bigint,
    total_noticias_nuevas bigint,
    total_creditos_usados bigint,
    costo_total_usd numeric,
    tiempo_promedio_ms numeric
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.biblioteca_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanas_publicitarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cola_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuraciones_regiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuentes_final ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_procesamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_scraping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metricas_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noticias_scrapeadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noticieros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraping_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_fuentes_suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uso_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v_metricas_scraping_mensual ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FIN DEL SCHEMA
-- ============================================
