import { NextResponse } from 'next/server'
import { getSupabaseSession, supabaseAdmin } from '@/lib/supabase-server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'

// Initialize Supabase client with Service Role Key for secure operations
const supabase = supabaseAdmin

// Path to F5_Test targets directory
// Assuming F5_Test is at the same level as CODIGO_FUENTE (parent of app)
const TARGETS_DIR = path.resolve(process.cwd(), '../F5_Test/targets')

export async function POST(request: Request) {
    try {
        // 1. Check authentication
        const session = await getSupabaseSession()
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user ID from email
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('email', session.user.email)
            .single()

        if (userError || !userData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const userId = userData.id

        // 2. Process FormData
        const formData = await request.formData()
        const file = formData.get('file') as File
        const name = formData.get('name') as string

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        if (!name) {
            return NextResponse.json({ error: 'No name provided' }, { status: 400 })
        }

        // 3. Validate file type
        // XTTS supports wav, mp3, flac, m4a
        const validTypes = [
            'audio/wav', 'audio/x-wav',
            'audio/mpeg', 'audio/mp3',
            'audio/x-m4a', 'audio/m4a', 'audio/mp4',
            'audio/flac', 'audio/x-flac'
        ]

        const lowerName = file.name.toLowerCase()
        const isValidExtension = lowerName.endsWith('.wav') ||
            lowerName.endsWith('.mp3') ||
            lowerName.endsWith('.m4a') ||
            lowerName.endsWith('.flac')

        if (!validTypes.includes(file.type) && !isValidExtension) {
            return NextResponse.json({
                error: 'Tipo de archivo no válido. Se permiten: WAV, MP3, M4A, FLAC.'
            }, { status: 400 })
        }

        // 4. Save file to SistemTTS/targets
        const buffer = Buffer.from(await file.arrayBuffer())
        const fileExtension = path.extname(file.name) || '.wav'
        const uniqueFilename = `${uuidv4()}${fileExtension}`
        const filePath = path.join(TARGETS_DIR, uniqueFilename)

        // Ensure directory exists
        if (!fs.existsSync(TARGETS_DIR)) {
            fs.mkdirSync(TARGETS_DIR, { recursive: true })
        }

        await writeFile(filePath, new Uint8Array(buffer))

        // 5. Call F5_Test to analyze the voice and get voice_stats
        let voiceStats = null
        try {
            const f5FormData = new FormData()
            f5FormData.append('audio', new Blob([buffer]), uniqueFilename)
            f5FormData.append('voice_id', uniqueFilename.replace(/\.[^/.]+$/, ''))

            const f5Response = await fetch('http://127.0.0.1:5000/upload_voice', {
                method: 'POST',
                body: f5FormData
            })

            if (f5Response.ok) {
                const f5Data = await f5Response.json()
                voiceStats = f5Data.voice_stats
                console.log('[Voice Upload] Voice stats received:', voiceStats)
            } else {
                console.warn('[Voice Upload] F5_Test analysis failed, continuing without stats')
            }
        } catch (f5Error) {
            console.warn('[Voice Upload] Could not connect to F5_Test for analysis:', f5Error)
            // Continue without voice stats - the voice file is still saved
        }

        // 6. Insert into biblioteca_audio with voice_stats
        const { data: insertData, error: insertError } = await supabase
            .from('biblioteca_audio')
            .insert({
                user_id: userId,
                nombre: name,
                audio: uniqueFilename, // This is the ID used by TTS server
                tipo: 'voz',
                genero: 'neutro', // Default
                idioma: 'español',
                metadata: {
                    original_filename: file.name,
                    source: 'user_upload',
                    voice_stats: voiceStats || {  // Use analyzed stats or defaults
                        wpm: 150,
                        tempo: 4.0,
                        avg_pause_ms: 400,
                        energy_profile: 'mixed'
                    }
                }
            })
            .select()
            .single()

        if (insertError) {
            console.error('Database error:', insertError)
            // Try to delete the file if DB insert fails
            try {
                fs.unlinkSync(filePath)
            } catch (e) {
                console.error('Failed to cleanup file:', e)
            }
            return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            voice: insertData,
            voice_stats: voiceStats
        })

    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
