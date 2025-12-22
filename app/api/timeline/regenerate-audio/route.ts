import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { text, voiceId, newsId } = await req.json()

        if (!text) {
            return NextResponse.json({ error: 'Texto requerido' }, { status: 400 })
        }

        console.log(`🎙️ Regenerando audio para noticia ${newsId || 'temp'} con TTS Local...`)

        // Llamar al endpoint interno de TTS (que maneja Local TTS / ElevenLabs según config)
        const ttsUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/text-to-speech`

        const response = await fetch(ttsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text,
                provider: 'local-tts', // Forzamos o dejamos auto según preferencia
                voice: voiceId || 'default'
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Error en TTS Service: ${errorText}`)
        }

        const result = await response.json()

        if (!result.success) {
            throw new Error(result.error || 'Error desconocido en generación de audio')
        }

        return NextResponse.json({
            audioUrl: result.audioUrl,
            duration: result.duration,
            s3Key: result.s3Key
        })

    } catch (error: any) {
        console.error('❌ Error regenerando audio:', error)
        return NextResponse.json(
            { error: error.message || 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
