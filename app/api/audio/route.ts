export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * API Route para servir archivos de audio dinámicamente
 * Esto es necesario porque en producción (yarn start), Next.js no sirve
 * archivos creados después del build en /public
 * 
 * Uso: /api/audio?file=/audio/user/noticieros/noticiero.mp3
 * o:   /api/audio?file=/generated-audio/tts_123.wav
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filePath = searchParams.get('file');

        if (!filePath) {
            return NextResponse.json({ error: 'file parameter is required' }, { status: 400 });
        }

        // Sanitizar el path para evitar ataques de path traversal
        const sanitizedPath = filePath.replace(/\.\./g, '').replace(/\/\//g, '/');

        // Solo permitir archivos de audio
        const allowedExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm'];
        const ext = path.extname(sanitizedPath).toLowerCase();

        if (!allowedExtensions.includes(ext)) {
            return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
        }

        // Construir path completo (desde public/)
        const fullPath = path.join(process.cwd(), 'public', sanitizedPath);

        // Verificar que el archivo existe
        if (!fs.existsSync(fullPath)) {
            console.error(`Audio file not found: ${fullPath}`);
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        // Leer el archivo
        const fileBuffer = fs.readFileSync(fullPath);
        const stat = fs.statSync(fullPath);

        // Determinar content-type
        const contentTypes: Record<string, string> = {
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
            '.m4a': 'audio/mp4',
            '.aac': 'audio/aac',
            '.webm': 'audio/webm'
        };

        const contentType = contentTypes[ext] || 'audio/mpeg';

        // Retornar archivo con headers adecuados
        // Convertir Buffer a Uint8Array para compatibilidad con NextResponse
        return new NextResponse(new Uint8Array(fileBuffer), {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': stat.size.toString(),
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=86400', // Cache por 1 día
            }
        });

    } catch (error) {
        console.error('Error serving audio file:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
