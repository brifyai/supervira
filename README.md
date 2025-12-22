# VIRA - Sistema de Generación Automática de Noticieros

VIRA es una plataforma SaaS que permite a radios generar noticieros de audio automáticamente usando IA.

## 🎯 Características Principales

- **Scraping inteligente** de noticias desde múltiples fuentes
- **IA Directora** que planifica la estructura óptima del noticiero
- **Humanización de texto** para sonido natural en TTS
- **Text-to-Speech** con VoiceMaker (voces en español chileno)
- **Timeline editable** con drag & drop
- **Sistema multi-tenant** (admin → usuarios)

## 🚀 Quick Start

```bash
# Instalar dependencias
yarn install

# Configurar variables de entorno
cp .env.example .env.local

# Ejecutar en desarrollo
yarn dev
```

## 📁 Estructura del Proyecto

```
CODIGO_FUENTE/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   ├── crear-noticiero/   # UI creación de noticiero
│   ├── timeline-noticiero/# Editor de timeline
│   └── bibliotecas/       # Gestión de audio
├── components/            # Componentes React
├── lib/                   # Lógica de negocio
│   ├── director-ai.ts     # IA Directora
│   ├── humanize-text.ts   # Humanización TTS
│   ├── tts-providers.ts   # Proveedores TTS
│   └── audio-assembler.ts # Ensamblaje de audio
├── database/              # Schemas SQL
└── docs/                  # Documentación
```

## 🔧 Tecnologías

- **Frontend**: Next.js 14, React, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes, Supabase
- **IA**: Chutes AI (Qwen), VoiceMaker TTS
- **Audio**: FFmpeg para procesamiento

## 📖 Documentación

- [Guía de Instalación](docs/SETUP.md)
- [Guía de Demo](docs/DEMO.md)

## 📄 Licencia

Propietario - Todos los derechos reservados.
