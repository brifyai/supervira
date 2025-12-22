-- ==================================================
-- MIGRACIÓN: Agregar columnas de scraping configurable
-- Ejecutar en Supabase SQL Editor
-- ==================================================

-- 1. Agregar nuevas columnas a fuentes_final
ALTER TABLE "fuentes_final" 
  ADD COLUMN IF NOT EXISTS "tipo_scraping" TEXT DEFAULT 'web' CHECK (tipo_scraping IN ('rss', 'web', 'ambos')),
  ADD COLUMN IF NOT EXISTS "selectores_css" JSONB DEFAULT '{"contenido": [], "titulo": [], "resumen": [], "imagen": [], "eliminar": []}',
  ADD COLUMN IF NOT EXISTS "usa_premium_proxy" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "estado_test" TEXT DEFAULT 'pendiente' CHECK (estado_test IN ('pendiente', 'exitoso', 'fallido')),
  ADD COLUMN IF NOT EXISTS "ultimo_test" TIMESTAMPTZ;

-- 2. Insertar fuentes iniciales (Nacional)
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

-- 3. Insertar fuentes regionales (Ñuble)
INSERT INTO "fuentes_final" ("region", "nombre_fuente", "url", "rss_url", "tipo_scraping", "selectores_css", "estado_test") VALUES
('Ñuble', 'La Discusión', 'https://ladiscusion.cl', 'https://ladiscusion.cl/feed/', 'rss', '{}', 'exitoso'),
('Ñuble', 'SoyChillan', 'https://www.soychile.cl/chillan', NULL, 'web', '{
    "contenido": [".article-body", ".nota-cuerpo", ".content-article"],
    "eliminar": [".ads", "nav", "footer", ".menu"]
}', 'fallido')
ON CONFLICT (url) DO NOTHING;

-- 4. Insertar fuentes regionales (Biobío)
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

-- 5. Verificar resultado
SELECT nombre_fuente, region, tipo_scraping, rss_url IS NOT NULL as tiene_rss, estado_test 
FROM fuentes_final 
ORDER BY region, nombre_fuente;
