import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseSession, supabaseAdmin } from '@/lib/supabase-server'
import { CHUTES_CONFIG, getChutesHeaders } from '@/lib/chutes-config'
import { logTokenUsage, calculateChutesAICost } from '@/lib/usage-logger'

const supabase = supabaseAdmin

// Estimación calibrada: 10.5 caracteres por segundo (basado en pruebas reales: 19:12 vs 15:58)
const DEFAULT_CHARS_PER_SECOND = 12.5

export async function POST(request: NextRequest) {
    try {
        const session = await getSupabaseSession()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { newscastId, targetDuration, readingPace } = body

        // Usar el ritmo proporcionado o el defecto
        const charsPerSecond = readingPace || DEFAULT_CHARS_PER_SECOND

        // Estimación de palabras por minuto basada en caracteres por segundo (promedio 5 chars/palabra + 1 espacio)
        const wordsPerMinute = Math.floor((charsPerSecond * 60) / 6)

        if (!newscastId || !targetDuration) {
            return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 })
        }

        // 1. Obtener noticiero
        const { data: newscast, error: fetchError } = await supabase
            .from('noticieros')
            .select('*')
            .eq('id', newscastId)
            .eq('user_id', session.user.id)
            .single()

        if (fetchError || !newscast) {
            return NextResponse.json({ error: 'Noticiero no encontrado' }, { status: 404 })
        }

        // 2. Obtener timeline
        let timelineData = newscast.datos_timeline
        if (typeof timelineData === 'string') {
            timelineData = JSON.parse(timelineData)
        }

        let timeline = Array.isArray(timelineData) ? timelineData : timelineData?.timeline || []

        // Filtrar solo noticias (ignorar intro, outro, anuncios)
        const newsItems = timeline.filter((item: any) => item.type === 'news' || !item.type)

        if (newsItems.length === 0) {
            return NextResponse.json({ error: 'No hay noticias para ajustar' }, { status: 400 })
        }

        // 3. Calcular duración actual de noticias
        const currentNewsDuration = newsItems.reduce((acc: number, item: any) => acc + (item.duration || 0), 0)

        // Calcular duración de otros elementos (intro, ads, etc)
        const otherItemsDuration = timeline
            .filter((item: any) => item.type !== 'news' && item.type)
            .reduce((acc: number, item: any) => acc + (item.duration || 0), 0)

        // El tiempo disponible para noticias es el target menos lo que ocupan los otros elementos
        const targetNewsDuration = targetDuration - otherItemsDuration

        if (targetNewsDuration <= 0) {
            return NextResponse.json({ error: 'El tiempo objetivo es demasiado corto para los elementos fijos (intro/ads)' }, { status: 400 })
        }

        // Factor de ajuste
        const ratio = targetNewsDuration / currentNewsDuration
        console.log(`⏱️ Ajuste: Actual=${currentNewsDuration}s, Objetivo=${targetNewsDuration}s, Ratio=${ratio.toFixed(2)}, Ritmo=${charsPerSecond} chars/s`)

        // Si el ratio es muy cercano a 1 (ej. 0.95 a 1.05), no vale la pena reescribir todo
        if (ratio > 0.95 && ratio < 1.05) {
            return NextResponse.json({
                success: true,
                message: 'La duración ya está optimizada',
                timeline: timelineData
            })
        }

        // 4. Reescribir noticias con IA
        let totalTokensUsed = 0
        const updatedTimeline = [...timeline]

        for (let i = 0; i < updatedTimeline.length; i++) {
            const item = updatedTimeline[i]

            // Solo procesar noticias
            if (item.type !== 'news' && item.type) continue

            // Calcular nueva duración objetivo para esta noticia
            const currentItemDuration = item.duration || 30
            const targetItemDuration = Math.floor(currentItemDuration * ratio)

            // Calcular palabras objetivo usando el ritmo configurado
            const targetWords = Math.floor((targetItemDuration * wordsPerMinute) / 60)

            console.log(`📝 Reescribiendo noticia "${item.title}" para durar ~${targetItemDuration}s (${targetWords} palabras)`)

            // Obtener contexto de transición
            const isFirst = i === 0 || (updatedTimeline.slice(0, i).filter((x: any) => x.type === 'news' || !x.type).length === 0)
            const isLast = i === updatedTimeline.length - 1 || (updatedTimeline.slice(i + 1).filter((x: any) => x.type === 'news' || !x.type).length === 0)
            const prevNewsItem = updatedTimeline.slice(0, i).reverse().find((x: any) => x.type === 'news' || !x.type)
            const categoryChanged = prevNewsItem && prevNewsItem.category !== item.category

            // Construir sección de transición
            let transitionInstructions = ''
            if (isFirst) {
                transitionInstructions = '- Es la PRIMERA noticia: Comienza con "Comenzamos con..." o "Partimos con..."'
            } else if (isLast) {
                transitionInstructions = '- Es la ÚLTIMA noticia: Usa "Para finalizar..." o "Cerramos con..."'
            } else if (categoryChanged) {
                transitionInstructions = `- La categoría cambió a ${item.category}. Usa transición: "Pasamos a ${item.category}..." o "En ${item.category}..."`
            } else if (item.category) {
                transitionInstructions = `- Misma categoría (${item.category}): Usa "También..." o "Siguiendo con..." o "Otra noticia..."`
            }

            // Obtener región del noticiero
            const region = newscast.region || 'Chile'

            try {
                const prompt = `
                    Actúa como un locutor de radio profesional chileno de la región de ${region}.
                    Tu tarea es reescribir la siguiente noticia para que su lectura dure aproximadamente ${targetItemDuration} segundos.
                    
                    CONTEXTO:
                    - Noticia ${i + 1} de ${newsItems.length}
                    - Categoría: ${item.category || 'general'}
                    ${transitionInstructions}
                    
                    REGLAS DE CONTENIDO:
                    1. Mantén el tono informativo y profesional con estilo chileno.
                    2. Conserva los datos más importantes (qué, quién, cuándo, dónde).
                    3. La longitud debe ser aproximadamente de ${targetWords} palabras.
                    4. Incluye la transición apropiada al INICIO según el contexto.
                    5. No uses introducciones meta como "Aquí tienes la noticia".
                    
                    REGLAS PARA TTS (MUY IMPORTANTE):
                    6. Convierte las horas a lenguaje natural:
                       - "8:00 AM" → "ocho de la mañana"
                       - "3:30 PM" → "tres y media de la tarde"
                    7. Escribe números en palabras cuando sea apropiado:
                       - "3 personas" → "tres personas"
                       - Porcentajes: "un 45 por ciento"
                    8. EVITA estos símbolos:
                       - % → "por ciento"
                       - $ → "pesos" o "dólares"
                       - & → "y"
                       - No uses: @ # * / \\
                    9. Puntuación natural:
                       - Comas para pausas breves
                       - Puntos para pausas largas
                       - Evita punto y coma, dos puntos, guiones
                       - No uses comillas, paréntesis ni corchetes
                    10. Evita siglas poco conocidas, deletréalas o explícalas.

                    Noticia Original:
                    Título: ${item.title}
                    Contenido: ${item.content}
                `

                const response = await fetch(CHUTES_CONFIG.endpoints.chatCompletions, {
                    method: 'POST',
                    headers: getChutesHeaders(),
                    body: JSON.stringify({
                        model: CHUTES_CONFIG.model,
                        messages: [
                            { role: 'system', content: 'Eres un experto editor de noticias para radio chilena. Optimizas textos para ser leídos por sistemas TTS manteniendo naturalidad y fluidez.' },
                            { role: 'user', content: prompt }
                        ],
                        max_tokens: 1000,
                        temperature: 0.7
                    })
                })

                if (!response.ok) {
                    console.error(`Error Chutes AI: ${response.status}`)
                    continue
                }

                const data = await response.json()
                const newContent = data.choices[0]?.message?.content?.trim()
                const tokens = data.usage?.total_tokens || 0
                totalTokensUsed += tokens

                if (newContent) {
                    // Calcular factor de velocidad (12.5 es el estándar)
                    // Si pace es 15, speed = 1.2 (20% más rápido)
                    // Si pace es 10, speed = 0.8 (20% más lento)
                    const speedFactor = charsPerSecond / 12.5;

                    // Actualizar item
                    updatedTimeline[i] = {
                        ...item,
                        content: newContent,
                        duration: targetItemDuration, // Actualizamos la duración estimada
                        speed: speedFactor, // Guardamos la velocidad para el TTS
                        audioUrl: null, // Invalidar audio anterior
                        versions: {
                            ...item.versions,
                            ai_adjusted: newContent // Guardar versión
                        },
                        activeVersion: 'ai_adjusted'
                    }
                }

            } catch (err) {
                console.error(`Error procesando noticia ${item.id}:`, err)
            }
        }

        // 5. Registrar uso de tokens
        if (totalTokensUsed > 0) {
            const cost = calculateChutesAICost(totalTokensUsed)

            await logTokenUsage({
                user_id: session.user.id,
                servicio: 'chutes',
                operacion: 'procesamiento_texto',
                tokens_usados: totalTokensUsed,
                costo: cost,
                metadata: {
                    newscast_id: newscastId,
                    target_duration: targetDuration,
                    model: CHUTES_CONFIG.model
                }
            })
        }

        // 6. Actualizar DB
        const newTotalDuration = updatedTimeline.reduce((acc, item) => acc + (item.duration || 0), 0)

        const newTimelineData = {
            ...timelineData,
            timeline: updatedTimeline,
            metadata: {
                ...timelineData?.metadata,
                totalDuration: newTotalDuration
            }
        }

        const { error: updateError } = await supabase
            .from('noticieros')
            .update({
                datos_timeline: newTimelineData,
                duracion_segundos: newTotalDuration,
                updated_at: new Date().toISOString()
            })
            .eq('id', newscastId)

        if (updateError) throw updateError

        return NextResponse.json({
            success: true,
            timeline: newTimelineData,
            tokensUsed: totalTokensUsed,
            message: 'Duración ajustada exitosamente'
        })

    } catch (error: any) {
        console.error('Error en adjust-duration:', error)
        return NextResponse.json({
            error: 'Error interno del servidor',
            details: error.message
        }, { status: 500 })
    }
}
