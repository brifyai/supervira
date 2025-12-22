-- ============================================
-- VIRA - SEED DE DATOS PARA PRODUCCIÓN
-- ============================================
-- Este script inserta los datos MÍNIMOS necesarios
-- para que el sistema funcione en producción.
-- Ejecutar DESPUÉS de crear las tablas (schema).
-- ============================================

-- ============================================
-- 1. REGIONES DE CHILE (OBLIGATORIO)
-- ============================================
-- Sin estas regiones, no se pueden crear noticieros
-- ni filtrar fuentes por región.

INSERT INTO "configuraciones_regiones" ("region", "zona_horaria", "esta_activo") VALUES
    ('Arica y Parinacota', 'America/Santiago', true),
    ('Tarapacá', 'America/Santiago', true),
    ('Antofagasta', 'America/Santiago', true),
    ('Atacama', 'America/Santiago', true),
    ('Coquimbo', 'America/Santiago', true),
    ('Valparaíso', 'America/Santiago', true),
    ('Metropolitana de Santiago', 'America/Santiago', true),
    ('O''Higgins', 'America/Santiago', true),
    ('Maule', 'America/Santiago', true),
    ('Ñuble', 'America/Santiago', true),
    ('Biobío', 'America/Santiago', true),
    ('La Araucanía', 'America/Santiago', true),
    ('Los Ríos', 'America/Santiago', true),
    ('Los Lagos', 'America/Santiago', true),
    ('Aysén', 'America/Santiago', true),
    ('Magallanes y Antártica Chilena', 'America/Santiago', true),
    ('Nacional', 'America/Santiago', true)  -- Para noticias a nivel nacional
ON CONFLICT (region) DO NOTHING;

-- ============================================
-- 2. FUENTES DE NOTICIAS (OBLIGATORIO)
-- ============================================
-- Fuentes principales de noticias chilenas
-- Puedes agregar más o modificar según necesites

INSERT INTO "fuentes_final" ("region", "nombre_fuente", "url", "rss_url", "esta_activo", "tipo_scraping") VALUES
    -- Fuentes Nacionales
    ('Nacional', 'Emol', 'https://www.emol.com', 'https://www.emol.com/rss/rss.asp', true, 'web'),
    ('Nacional', 'La Tercera', 'https://www.latercera.com', 'https://www.latercera.com/feed/', true, 'web'),
    ('Nacional', 'BioBioChile', 'https://www.biobiochile.cl', 'https://www.biobiochile.cl/especial/rss/index.xml', true, 'web'),
    ('Nacional', 'Cooperativa', 'https://www.cooperativa.cl', NULL, true, 'web'),
    ('Nacional', '24 Horas', 'https://www.24horas.cl', NULL, true, 'web'),
    
    -- Fuentes Metropolitanas
    ('Metropolitana de Santiago', 'El Mostrador', 'https://www.elmostrador.cl', NULL, true, 'web'),
    ('Metropolitana de Santiago', 'Radio ADN', 'https://www.adn.cl', NULL, true, 'web'),
    
    -- Fuentes Valparaíso
    ('Valparaíso', 'El Mercurio de Valparaíso', 'https://www.mercuriovalpo.cl', NULL, true, 'web'),
    
    -- Fuentes Biobío
    ('Biobío', 'Diario Concepción', 'https://www.diarioconcepcion.cl', NULL, true, 'web')
ON CONFLICT (url) DO NOTHING;

-- ============================================
-- 3. CONFIGURACIÓN DEL SISTEMA (OPCIONAL)
-- ============================================
-- Configuraciones globales como limpieza automática

INSERT INTO "system_config" ("key", "value", "description") VALUES
    ('auto_clean_days', '7', 'Días después de los cuales se limpian noticias antiguas'),
    ('cleanup_enabled', 'true', 'Habilitar limpieza automática de noticias'),
    ('max_news_per_newscast', '10', 'Máximo de noticias por noticiero'),
    ('default_voice_provider', 'voicemaker', 'Proveedor TTS por defecto')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================
-- 4. USUARIO SUPER ADMIN (OBLIGATORIO)
-- ============================================
-- Crea un usuario super_admin inicial
-- ⚠️ IMPORTANTE: Cambiar la contraseña después del primer login

-- Contraseña hasheada de ejemplo: "admin123" (bcrypt)
-- En producción, el usuario debería registrarse normalmente
-- o usar Supabase Auth y luego actualizar el rol

INSERT INTO "users" ("email", "password_hash", "nombre_completo", "role", "is_active", "company") VALUES
    ('admin@tudominio.cl', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Super Administrador', 'super_admin', true, 'Tu Empresa')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- FIN DEL SEED
-- ============================================
-- Para verificar que todo se insertó correctamente:
-- 
-- SELECT COUNT(*) FROM configuraciones_regiones;  -- Debería ser 17
-- SELECT COUNT(*) FROM fuentes_final;             -- Debería ser 9+
-- SELECT COUNT(*) FROM system_config;             -- Debería ser 4
-- SELECT * FROM users WHERE role = 'super_admin'; -- Debería haber 1
-- ============================================
