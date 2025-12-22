import { NextRequest, NextResponse } from 'next/server';
import { CHUTES_CONFIG, getChutesHeaders, validateChutesConfig } from '@/lib/chutes-config';

// Configuración directa de Google Gemini 2.5 Flash
const GEMINI_CONFIG = {
  apiKey: process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
  model: 'gemini-2.0-flash-exp',
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'
}

// Función para obtener headers de Gemini
const getGeminiHeaders = () => ({
  'Content-Type': 'application/json'
})

/**
 * API Route: POST /api/humanize-title
 * 
 * Genera un resumen breve de un título de noticia usando Chutes AI.
 * Esta ruta existe para mantener la API key segura en el servidor,
 * permitiendo que componentes cliente soliciten humanización sin exponer secrets.
 */
export async function POST(request: NextRequest) {
    try {
        // Validate Chutes AI configuration
        if (!validateChutesConfig()) {
            console.error('Chutes AI no configurado correctamente');
            return NextResponse.json(
                { error: 'Configuración de Chutes AI incompleta' },
                { status: 500 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { title } = body;

        if (!title?.trim()) {
            return NextResponse.json(
                { error: 'Se requiere un título para resumir' },
                { status: 400 }
            );
        }

        // Call Gemini API directamente
        const response = await fetch(`${GEMINI_CONFIG.endpoint}?key=${GEMINI_CONFIG.apiKey}`, {
            method: 'POST',
            headers: getGeminiHeaders(),
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Eres un locutor de radio profesional chileno. Transforma títulos en frases naturales para TTS con español perfecto.

🎯 REGLA CRÍTICA: PRESERVAR ESPAÑOL PERFECTO PARA TTS
- **MANTENER TODOS LOS ACENTOS Y TILDES**: México, Perú, Argentina, construcción, información, público, miércoles, año, también, además, política, económico, técnico, básico, análisis
- **PRESERVAR LA Ñ**: niño, camión, mañana, año, muñeca, cañón, ñandú
- **ACENTOS EN VOCALES TÓNICAS**: sé, dé, mí, tú, él, qué, quién, cómo, dónde, cuándo, porqué
- **VERBOS IRREGULARES**: dijéramos, fuéramos, tuviéramos, hubiéramos, dijésemos
- **NUNCA OMITIR ACENTOS**: México (no Mexico), Perú (no Peru), año (no ano), además (no ademas), también (no tambien)

Transforma este título en una frase natural para radio, preservando todos los acentos, tildes y ñ para TTS perfecto: "${title}"`
                    }]
                }],
                generationConfig: {
                    maxOutputTokens: 100,
                    temperature: 0.7
                }
            })
        });

        if (!response.ok) {
            console.error(`Error en Gemini API: ${response.status} ${response.statusText}`);
            return NextResponse.json(
                { error: `Error en API de Gemini: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Extract humanized title from response
        const humanizedTitle = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

        if (!humanizedTitle) {
            return NextResponse.json(
                { error: 'No se pudo generar el título humanizado' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            originalTitle: title,
            humanizedTitle: humanizedTitle
        });

    } catch (error) {
        console.error('Error en /api/humanize-title:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
