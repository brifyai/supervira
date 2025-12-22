export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

export async function GET() {
    try {
        // ✅ Prioridad 1: Voces Gemini TTS configuradas
        // ✅ Prioridad 2: Voces VoiceMaker como backup
        const { GEMINI_VOICES, VOICEMAKER_VOICES } = await import('@/lib/tts-providers')
        
        const geminiVoices = process.env.GOOGLE_GEMINI_API_KEY ?
            Object.values(GEMINI_VOICES).map(voice => ({
                id: voice.id,
                name: voice.name,
                language: voice.language,
                type: 'gemini',
                isUserVoice: false,
                wpm: voice.wpm,
                tempo: 4.0,
                avg_pause_ms: voice.avgPauseMs,
                energy_profile: 'news',
                gender: voice.gender,
                pitchRange: voice.pitchRange
            })) : []

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

        // Combinar todas las voces disponibles
        const allVoices = [...geminiVoices, ...voicemakerVoices]

        return NextResponse.json({ voices: allVoices })

    } catch (error) {
        console.error('Error fetching voices:', error)
        return NextResponse.json(
            { error: 'Error al obtener voces disponibles' },
            { status: 500 }
        )
    }
}
