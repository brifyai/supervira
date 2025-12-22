import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseSession, supabaseAdmin } from '@/lib/supabase-server'
import { CHUTES_CONFIG, getChutesHeaders } from '@/lib/chutes-config'
import { logTokenUsage, calculateChutesAICost } from '@/lib/usage-logger'

const supabase = supabaseAdmin

/**
 * Humaniza el texto de la noticia usando Chutes AI
 * Mismas reglas que generate-newscast para consistencia
 */
async function humanizeNewsText(
    text: string,
    region: string,
    userId: string,
    context: { index: number; total: number; category: string }
): Promise<{ content: string; tokensUsed: number; cost: number }> {
    try {
        const prompt = `
            Actúa como un locutor de radio profesional chileno de la región de ${region}.
            Reescribe la siguiente noticia para ser leída al aire por un sistema de texto a voz (TTS).
            
            CONTEXTO:
            - Esta noticia se agregará al final del noticiero
            - Categoría: ${context.category || 'general'}
            
            REGLAS DE ESTILO:
            1. Usa un lenguaje claro, directo y formal pero cercano.
            2. Usa modismos chilenos suaves si aplica, pero mantén la profesionalidad.
            3. Resume lo más importante en máximo 3 párrafos cortos.
            4. El texto debe durar aproximadamente 45-60 segundos al leerse.

            REGLAS PARA TTS (MUY IMPORTANTE):
            5. Convierte las horas a lenguaje natural:
               - "8:00 AM" → "ocho de la mañana"
               - "3:30 PM" → "tres y media de la tarde"
            6. Escribe los números en palabras cuando sea apropiado:
               - "3 personas" → "tres personas"
               - Porcentajes: "un 45 por ciento"
            7. EVITA estos símbolos que el TTS lee literalmente:
               - % → "por ciento"
               - $ → "pesos" o "dólares"
               - & → "y"
               - No uses: @ # * / \\
            8. Puntuación para fluidez natural:
               - Comas para pausas breves
               - Puntos para pausas largas
               - Evita punto y coma, dos puntos, guiones
               - No uses comillas, paréntesis ni corchetes
            9. Evita siglas poco conocidas, deletréalas o explícalas.
            10. URLs y enlaces: solo menciona el nombre del sitio.

            Noticia original:
            "${text.substring(0, 2000)}"
        `

        const response = await fetch(CHUTES_CONFIG.endpoints.chatCompletions, {
            method: 'POST',
            headers: getChutesHeaders(),
            body: JSON.stringify({
                model: CHUTES_CONFIG.model,
                messages: [
                    { role: 'system', content: 'Eres un redactor de noticias de radio experto chileno. Optimizas textos para TTS.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error(`❌ Error Chutes AI (${response.status}):`, errorText)
            throw new Error(`Error en Chutes AI: ${response.status}`)
        }

        const data = await response.json()
        const content = data.choices[0].message.content.trim()

        // Capturar tokens usados
        const tokensUsed = data.usage?.total_tokens || 0
        const cost = calculateChutesAICost(tokensUsed)

        // Registrar uso de tokens
        if (tokensUsed > 0) {
            await logTokenUsage({
                user_id: userId,
                servicio: 'chutes',
                operacion: 'humanizacion',
                tokens_usados: tokensUsed,
                costo: cost,
                metadata: {
                    model: CHUTES_CONFIG.model,
                    region,
                    prompt_tokens: data.usage?.prompt_tokens || 0,
                    completion_tokens: data.usage?.completion_tokens || 0,
                    text_length: text.length,
                    category: context.category
                }
            })
        }

        return { content, tokensUsed, cost }
    } catch (error) {
        console.error('Error humanizando texto:', error)
        // Fallback: devolver texto original
        return { content: text, tokensUsed: 0, cost: 0 }
    }
}

/**
 * POST /api/add-news-to-timeline
 * Agrega una noticia scrapeada al timeline de un noticiero
 * - Humaniza el texto automáticamente
 * - NO genera audio (se genera al finalizar)
 * - Registra uso de tokens
 * 
 * Body:
 * - newscastId: string
 * - newsId: string (ID de noticias_scrapeadas)
 */
export async function POST(request: NextRequest) {
    try {
        // Autenticación
        const session = await getSupabaseSession()
        const userId = session?.user?.id
        const userEmail = session?.user?.email

        if (!userId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { newscastId, newsId } = body

        if (!newscastId || !newsId) {
            return NextResponse.json(
                { error: 'newscastId y newsId son requeridos' },
                { status: 400 }
            )
        }

        console.log(`➕ Agregando noticia ${newsId} al noticiero ${newscastId}`)

        // 1. Verificar que el noticiero existe y pertenece al usuario
        const { data: newscast, error: newscastError } = await supabase
            .from('noticieros')
            .select('*')
            .eq('id', newscastId)
            .eq('user_id', userId)
            .single()

        if (newscastError || !newscast) {
            return NextResponse.json(
                { error: 'Noticiero no encontrado o no tienes permisos' },
                { status: 404 }
            )
        }

        // 2. Obtener la noticia de noticias_scrapeadas
        const { data: scrapedNews, error: newsError } = await supabase
            .from('noticias_scrapeadas')
            .select('*')
            .eq('id', newsId)
            .single()

        if (newsError || !scrapedNews) {
            return NextResponse.json(
                { error: 'Noticia no encontrada' },
                { status: 404 }
            )
        }

        console.log(`📰 Noticia encontrada: ${scrapedNews.titulo}`)

        // 3. Obtener timeline actual para saber contexto
        let timelineData = newscast.datos_timeline
        if (typeof timelineData === 'string') {
            timelineData = JSON.parse(timelineData)
        }
        let timeline = Array.isArray(timelineData) ? timelineData : timelineData?.timeline || []
        const newsCount = timeline.filter((item: any) => item.type === 'news' || !item.type).length

        // 4. Humanizar el texto de la noticia
        console.log('🧠 Humanizando texto de la noticia...')
        const region = newscast.region || 'Chile'
        const rawText = `${scrapedNews.titulo}. ${scrapedNews.contenido || scrapedNews.resumen || ''}`

        const humanizedResult = await humanizeNewsText(
            rawText,
            region,
            userId,
            {
                index: newsCount,
                total: newsCount + 1,
                category: scrapedNews.categoria || 'general'
            }
        )

        console.log(`✅ Texto humanizado (${humanizedResult.tokensUsed} tokens, $${humanizedResult.cost.toFixed(4)})`)

        // 5. Verificar que la noticia no existe ya en el timeline
        const existingNews = timeline.find((item: any) => item.newsId === newsId)
        if (existingNews) {
            return NextResponse.json(
                { error: 'Esta noticia ya está en el timeline' },
                { status: 400 }
            )
        }

        // 6. Estimar duración (aprox 150 palabras por minuto)
        const wordCount = humanizedResult.content.split(' ').length
        const estimatedDuration = Math.ceil((wordCount / 150) * 60)

        // 7. Crear item para el timeline con ID único
        const uniqueId = `news_${newsId}_${Date.now()}` // ID único para React keys
        const newNewsItem = {
            id: uniqueId,           // ID único para el timeline
            newsId: newsId,         // ID original de la noticia (para referencia)
            type: 'news',
            title: scrapedNews.titulo,
            originalContent: rawText,
            content: humanizedResult.content,
            category: scrapedNews.categoria || 'general',
            source: scrapedNews.fuente,
            duration: estimatedDuration,
            audioUrl: null, // Se generará al finalizar
            isHumanized: true,
            addedManually: true,
            voiceId: 'default'
        }

        // 7. Agregar al timeline ANTES del cierre/outro
        // Buscar índice del cierre o outro para insertar antes
        const outroIndex = timeline.findIndex((item: any) =>
            item.type === 'outro' ||
            item.type === 'cierre' ||
            item.title?.toLowerCase().includes('cierre') ||
            item.title?.toLowerCase().includes('despedida')
        )

        if (outroIndex !== -1) {
            // Insertar antes del cierre
            timeline.splice(outroIndex, 0, newNewsItem)
            console.log(`📍 Noticia insertada en posición ${outroIndex} (antes del cierre)`)
        } else {
            // No hay cierre, agregar al final
            timeline.push(newNewsItem)
            console.log(`📍 Noticia agregada al final del timeline`)
        }

        // 8. Actualizar metadata
        const totalDuration = timeline.reduce((sum: number, item: any) => sum + (item.duration || 30), 0)

        const updatedTimelineData = {
            timeline,
            metadata: {
                totalDuration,
                targetDuration: newscast.duracion_segundos || 900,
                newsCount: timeline.filter((item: any) => item.type === 'news' || !item.type).length,
                region: newscast.region,
                generatedAt: newscast.created_at,
                lastModified: new Date().toISOString()
            }
        }

        // 9. Actualizar noticiero en BD
        const { error: updateError } = await supabase
            .from('noticieros')
            .update({
                datos_timeline: updatedTimelineData,
                duracion_segundos: totalDuration,
                updated_at: new Date().toISOString()
            })
            .eq('id', newscastId)

        if (updateError) {
            console.error('Error actualizando noticiero:', updateError)
            return NextResponse.json(
                { error: 'Error actualizando noticiero' },
                { status: 500 }
            )
        }

        // 10. Marcar noticia como procesada
        await supabase
            .from('noticias_scrapeadas')
            .update({ fue_procesada: true })
            .eq('id', newsId)

        console.log('✅ Noticia agregada exitosamente al timeline')

        return NextResponse.json({
            success: true,
            newsItem: newNewsItem,
            timeline: updatedTimelineData,
            tokensUsed: humanizedResult.tokensUsed,
            cost: humanizedResult.cost,
            message: 'Noticia agregada y humanizada exitosamente. El audio se generará al finalizar el noticiero.'
        })

    } catch (error) {
        console.error('Error en /api/add-news-to-timeline:', error)
        return NextResponse.json(
            {
                error: 'Error interno del servidor',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
