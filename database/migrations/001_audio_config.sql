-- ==================================================
-- MIGRACIÓN: Audio Personalizado en Timeline
-- ==================================================
-- Versión: 2.1
-- Fecha: 2024-12-04
-- Descripción: Agrega configuración de audio a plantillas y noticieros
--              para soportar cortinas automáticas y música de fondo
-- ==================================================

-- ==================================================
-- 1. AGREGAR audio_config A PLANTILLAS
-- ==================================================
-- Configuración de audio por plantilla:
-- - cortinas_enabled: si insertar cortinas automáticamente
-- - cortinas_frequency: cada cuántas noticias insertar cortina
-- - cortina_default_id: UUID del audio de cortina por defecto
-- - background_music_enabled: si usar música de fondo
-- - background_music_id: UUID del audio de música de fondo
-- - background_music_volume: volumen de la música (0.0 a 1.0)

ALTER TABLE plantillas 
ADD COLUMN IF NOT EXISTS audio_config JSONB DEFAULT '{
  "cortinas_enabled": false,
  "cortinas_frequency": 3,
  "cortina_default_id": null,
  "background_music_enabled": false,
  "background_music_id": null,
  "background_music_volume": 0.2
}'::jsonb;

COMMENT ON COLUMN plantillas.audio_config IS 'Configuración de audio: cortinas automáticas y música de fondo';

-- ==================================================
-- 2. AGREGAR COLUMNAS DE MÚSICA DE FONDO A NOTICIEROS
-- ==================================================
-- Cada noticiero puede tener su propia música de fondo

ALTER TABLE noticieros 
ADD COLUMN IF NOT EXISTS background_music_url TEXT;

ALTER TABLE noticieros 
ADD COLUMN IF NOT EXISTS background_music_volume NUMERIC(3,2) DEFAULT 0.2;

COMMENT ON COLUMN noticieros.background_music_url IS 'URL de la música de fondo para este noticiero';
COMMENT ON COLUMN noticieros.background_music_volume IS 'Volumen de la música de fondo (0.0 a 1.0)';

-- ==================================================
-- 3. AGREGAR COLUMNA usuario A biblioteca_audio (si no existe)
-- ==================================================
-- Para filtrar audio por usuario

ALTER TABLE biblioteca_audio 
ADD COLUMN IF NOT EXISTS usuario TEXT;

COMMENT ON COLUMN biblioteca_audio.usuario IS 'Email del usuario propietario del audio (o "todos" para global)';

-- ==================================================
-- 4. CREAR ÍNDICES PARA MEJOR RENDIMIENTO
-- ==================================================

-- Índice para buscar audios por tipo y usuario
CREATE INDEX IF NOT EXISTS idx_biblioteca_audio_tipo_usuario 
ON biblioteca_audio(tipo, usuario);

-- Índice para buscar cortinas activas
CREATE INDEX IF NOT EXISTS idx_biblioteca_audio_cortinas 
ON biblioteca_audio(tipo) 
WHERE tipo = 'cortina' AND is_active = true;

-- Índice para buscar música activa
CREATE INDEX IF NOT EXISTS idx_biblioteca_audio_musica 
ON biblioteca_audio(tipo) 
WHERE tipo = 'musica' AND is_active = true;

-- ==================================================
-- 5. VERIFICACIÓN
-- ==================================================
-- Ejecutar estas consultas para verificar que la migración fue exitosa:

-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'plantillas' AND column_name = 'audio_config';

-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'noticieros' AND column_name IN ('background_music_url', 'background_music_volume');

-- ==================================================
-- FIN DE MIGRACIÓN
-- ==================================================
