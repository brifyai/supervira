/**
 * API para generar noticiero urgente (Último Minuto)
 * Usa humanización con Chutes AI y guarda en tabla noticieros
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseSession, supabaseAdmin } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/supabase-auth'
import { getResourceOwnerId } from '@/lib/resource-owner'
import { humanizeText, TransitionContext } from '@/lib/humanize-text'
import { logTokenUsage } from '@/lib/usage-logger'

const supabase = supabaseAdmin

export async function POST(request: NextRequest) {
  try {
    // Autenticación
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const userId = currentUser.id
    const ownerId = getResourceOwnerId(currentUser as any)

    const {
      news,
      timeFrame,
      region,
      priority,
      voiceModel,
      voiceWPM = 150 // WPM por defecto si no viene
    } = await request.json()

    // Validaciones
    if (!news || !Array.isArray(news) || news.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionaron noticias para el noticiero' },
        { status: 400 }
      )
    }

    console.log('🔴 Generando noticiero urgente:', {
      newsCount: news.length,
      timeFrame,
      region,
      priority,
      voiceWPM
    })

    // Ordenar noticias por urgencia (urgentes primero)
    const sortedNews = [...news].sort((a: any, b: any) => {
      const urgencyOrder: Record<string, number> = { 'high': 3, 'medium': 2, 'low': 1 }
      return (urgencyOrder[b.urgency] || 1) - (urgencyOrder[a.urgency] || 1)
    })

    // Limitar a máximo 10 noticias
    const selectedNews = sortedNews.slice(0, 10)

    // Generar timeline
    const timeline: any[] = []
    let totalDuration = 0
    let totalTokens = 0
    let totalCost = 0

    // 1. Introducción urgente
    const introText = generateUrgentIntro(timeFrame, region, selectedNews.length)
    const introWordCount = introText.split(' ').length
    const introDuration = Math.ceil((introWordCount / voiceWPM) * 60)

    timeline.push({
      id: `intro-${Date.now()}`,
      type: 'intro',
      title: 'Introducción - Último Minuto',
      content: introText,
      duration: introDuration,
      isHumanized: true,
      voiceId: voiceModel || 'default'
    })
    totalDuration += introDuration

    // 2. Procesar cada noticia con humanización
    let previousCategory: string | null = null

    for (let i = 0; i < selectedNews.length; i++) {
      const newsItem = selectedNews[i]

      console.log(`📰 Humanizando noticia ${i + 1}/${selectedNews.length}: ${newsItem.title?.substring(0, 50)}...`)

      // Construir texto original para humanizar
      const rawContent = `${newsItem.title}. ${newsItem.content || newsItem.summary || ''}`

      // Contexto de transición
      const transitionContext: TransitionContext = {
        index: i,
        total: selectedNews.length,
        category: newsItem.category || 'general',
        previousCategory
      }

      // Humanizar con IA
      const humanizedResult = await humanizeText(
        rawContent,
        region || 'Nacional',
        userId,
        transitionContext
      )

      totalTokens += humanizedResult.tokensUsed
      totalCost += humanizedResult.cost

      // Calcular duración basada en WPM
      const wordCount = humanizedResult.content.split(' ').length
      const estimatedDuration = Math.ceil((wordCount / voiceWPM) * 60)

      timeline.push({
        id: newsItem.id || `news-${i}-${Date.now()}`,
        type: 'news',
        title: newsItem.title,
        originalContent: rawContent,
        content: humanizedResult.content,
        duration: estimatedDuration,
        isHumanized: true,
        voiceId: voiceModel || 'default',
        category: newsItem.category || 'general',
        source: newsItem.source,
        urgency: newsItem.urgency,
        url: newsItem.url
      })
      totalDuration += estimatedDuration

      previousCategory = newsItem.category || 'general'
    }

    // 3. Cierre/Outro
    const outroText = generateUrgentOutro(timeFrame, selectedNews.length)
    const outroWordCount = outroText.split(' ').length
    const outroDuration = Math.ceil((outroWordCount / voiceWPM) * 60)

    timeline.push({
      id: `outro-${Date.now()}`,
      type: 'outro',
      title: 'Cierre - Último Minuto',
      content: outroText,
      duration: outroDuration,
      isHumanized: true,
      voiceId: voiceModel || 'default'
    })
    totalDuration += outroDuration

    // Guardar en tabla noticieros
    // Convertir 'all' a 'Nacional' para cumplir con foreign key
    const validRegion = (!region || region === 'all') ? 'Nacional' : region
    const reportTitle = `🔴 ÚLTIMO MINUTO - ${validRegion} (${new Date().toLocaleDateString('es-CL')})`

    const { data: noticiero, error: insertError } = await supabase
      .from('noticieros')
      .insert({
        titulo: reportTitle,
        region: validRegion,
        contenido: timeline.filter(item => item.type === 'news').map(item => item.content).join('\n\n'),
        datos_timeline: timeline,
        duracion_segundos: Math.round(totalDuration),
        estado: 'generado',
        costo_generacion: totalCost,
        total_tokens: totalTokens,
        metadata: {
          type: 'urgent',
          priority,
          timeFrame,
          newsCount: selectedNews.length,
          urgentCount: selectedNews.filter((n: any) => n.urgency === 'high').length,
          voiceModel,
          voiceWPM,
          generatedAt: new Date().toISOString()
        },
        user_id: ownerId
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('❌ Error guardando noticiero:', insertError)
      throw new Error(`Error guardando noticiero: ${insertError.message}`)
    }

    const noticieroId = noticiero?.id

    // Log de uso
    await logTokenUsage({
      user_id: userId,
      servicio: 'chutes',
      operacion: 'humanizacion',
      tokens_usados: totalTokens,
      costo: totalCost,
      metadata: {
        noticiero_id: noticieroId,
        priority,
        region,
        news_count: selectedNews.length
      }
    })

    console.log('✅ Noticiero urgente generado:', {
      id: noticieroId,
      duration: totalDuration,
      newsCount: selectedNews.length,
      tokens: totalTokens,
      cost: totalCost
    })

    return NextResponse.json({
      success: true,
      report_id: noticieroId,
      timeline,
      metadata: {
        totalDuration,
        newsCount: selectedNews.length,
        urgentCount: selectedNews.filter((n: any) => n.urgency === 'high').length,
        region,
        tokensUsed: totalTokens,
        cost: totalCost,
        type: 'urgent-breaking-news'
      }
    })

  } catch (error) {
    console.error('❌ Error generando noticiero urgente:', error)
    return NextResponse.json(
      { success: false, error: 'Error al generar noticiero urgente' },
      { status: 500 }
    )
  }
}

// === Funciones auxiliares ===

// Convertir número a texto para TTS
function numberToText(num: number): string {
  const numbers: Record<number, string> = {
    1: 'una', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco',
    6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez',
    11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
    16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve', 20: 'veinte',
    24: 'veinticuatro', 48: 'cuarenta y ocho'
  }
  return numbers[num] || num.toString()
}

// Convertir hora a texto natural para TTS
function timeToText(date: Date): string {
  const hour = date.getHours()
  const minute = date.getMinutes()

  // Convertir hora 24 a formato 12 con período
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const period = hour < 12 ? 'de la mañana' : hour < 19 ? 'de la tarde' : 'de la noche'

  const hourText = numberToText(hour12)

  if (minute === 0) {
    return `${hourText} ${period}`
  } else if (minute === 30) {
    return `${hourText} y media ${period}`
  } else if (minute === 15) {
    return `${hourText} y cuarto ${period}`
  } else if (minute < 10) {
    return `${hourText} con cero ${numberToText(minute)} ${period}`
  } else {
    return `${hourText} con ${minute < 20 ? numberToText(minute) : minute} ${period}`
  }
}

function generateUrgentIntro(timeFrame: string, region: string, newsCount: number): string {
  const now = new Date()
  const timeText = timeToText(now)
  const newsCountText = numberToText(newsCount)
  const timeFrameText = numberToText(parseInt(timeFrame))

  return `Atención, noticiero de último minuto. Son las ${timeText} y le traemos ${newsCountText} noticias urgentes de las últimas ${timeFrameText} horas en ${region || 'el país'}. Manténgase informado con los acontecimientos más importantes que están ocurriendo.`
}

function generateUrgentOutro(timeFrame: string, newsCount: number): string {
  const now = new Date()
  const timeText = timeToText(now)
  const newsCountText = numberToText(newsCount)

  return `Este ha sido su noticiero de último minuto a las ${timeText}, con ${newsCountText} noticias importantes. Continuaremos monitoreando la situación. Manténgase conectado para más actualizaciones.`
}
