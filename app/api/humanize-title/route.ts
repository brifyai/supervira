import { NextRequest, NextResponse } from 'next/server';
import { CHUTES_CONFIG, getChutesHeaders, validateChutesConfig } from '@/lib/chutes-config';

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

        // Call Chutes AI API
        const response = await fetch(CHUTES_CONFIG.endpoints.chatCompletions, {
            method: 'POST',
            headers: getChutesHeaders(),
            body: JSON.stringify({
                model: CHUTES_CONFIG.model,
                messages: [
                    {
                        role: 'user',
                        content: `resume la siguiente noticia de manera breve:"${title}"`
                    }
                ],
                stream: false,
                max_tokens: 300,
                temperature: 0.4
            })
        });

        if (!response.ok) {
            console.error(`Error en Chutes API: ${response.status} ${response.statusText}`);
            return NextResponse.json(
                { error: `Error en API de Chutes: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Extract summary from response
        const summary = data.choices?.[0]?.message?.content || '';

        if (!summary) {
            return NextResponse.json(
                { error: 'No se pudo generar el resumen' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            summary
        });

    } catch (error) {
        console.error('Error en /api/humanize-title:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
