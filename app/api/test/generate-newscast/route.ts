import { NextRequest, NextResponse } from 'next/server';

// Endpoint de prueba sin autenticación
export async function POST(request: NextRequest) {
    try {
        const config = await request.json();

        // Redirigir al endpoint real pero con un user_id de prueba
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Llamar al endpoint real usando fetch interno
        const response = await fetch(`${appUrl}/api/generate-newscast`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Simular una sesión de prueba
                'x-test-user-id': 'test-user-id'
            },
            body: JSON.stringify(config)
        });

        const data = await response.json();

        return NextResponse.json(data, { status: response.status });

    } catch (error) {
        console.error('❌ Error en test endpoint:', error);
        return NextResponse.json(
            { success: false, error: 'Error en el test' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Endpoint de prueba para generar noticieros sin autenticación',
        usage: 'POST con body: { "region": "Nacional", "targetDuration": 180, "generateAudioNow": false }'
    });
}
