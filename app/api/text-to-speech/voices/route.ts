export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

export async function GET() {
    try {
        // ✅ Solo voces VoiceMaker configuradas (Vicente y Eliana)
        // No se buscan voces clonadas de la base de datos
        const voicemakerVoices = process.env.VOICEMAKER_API_KEY ? [
            {
                id: 'ai3-es-CL-Vicente',
                name: '🎙️ Vicente (VoiceMaker)',
                language: 'es-CL',
                type: 'voicemaker',
                isUserVoice: false,
                wpm: 175,  // WPM base antes de ajuste de velocidad
                tempo: 4.0,
                avg_pause_ms: 200,
                energy_profile: 'news'
            },
            {
                id: 'ai3-es-CL-Eliana',
                name: '🎙️ Eliana (VoiceMaker)',
                language: 'es-CL',
                type: 'voicemaker',
                isUserVoice: false,
                wpm: 162,  // Calibrado intermedio (155=corto, 168=largo)
                tempo: 4.0,
                avg_pause_ms: 250,
                energy_profile: 'news'
            }
        ] : []

        return NextResponse.json({ voices: voicemakerVoices })

    } catch (error) {
        console.error('Error fetching voices:', error)
        return NextResponse.json(
            { error: 'Error al obtener voces disponibles' },
            { status: 500 }
        )
    }
}
