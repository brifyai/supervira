# Guía de Instalación - VIRA

## Requisitos Previos

- Node.js 18+
- Yarn
- FFmpeg instalado y en PATH
- Cuenta Supabase
- API Key VoiceMaker
- API Key ScrapingBee

## 1. Clonar y Dependencias

```bash
git clone [repo-url]
cd CODIGO_FUENTE
yarn install
```

## 2. Variables de Entorno

Crear `.env.local` con:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# TTS
VOICEMAKER_API_KEY=xxx

# Scraping
SCRAPINGBEE_API_KEY=xxx

# IA
CHUTES_API_KEY=xxx

# Opcional
CRON_SECRET=xxx
```

## 3. Base de Datos

Ejecutar en Supabase SQL Editor:
- `database/vira_schema_actual.sql`

## 4. Ejecutar

```bash
# Desarrollo
yarn dev

# Producción
yarn build
yarn start
```

## 5. Verificar

1. Abrir http://localhost:3000
2. Iniciar sesión
3. Ir a "Crear Noticiero"
4. Verificar que las fuentes cargan

## Problemas Comunes

| Problema | Solución |
|----------|----------|
| Error audio | Verificar FFmpeg instalado |
| Scraping falla | Revisar ScrapingBee credits |
| TTS error | Verificar VoiceMaker API key |
