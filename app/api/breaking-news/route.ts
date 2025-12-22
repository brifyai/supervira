import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseSession, supabaseAdmin } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/supabase-auth'
import { getResourceOwnerId } from '@/lib/resource-owner'

export async function POST(request: NextRequest) {
  try {
    // Obtener usuario autenticado
    const currentUser = await getCurrentUser()

    // Si no hay usuario autenticado, mostrar todas las noticias (modo público)
    // Si hay usuario, filtrar por sus suscripciones
    let subscribedFuenteIds: string[] = []

    if (currentUser) {
      const ownerId = getResourceOwnerId(currentUser as any)

      // Obtener fuentes suscritas del usuario/admin
      const { data: suscripciones } = await supabaseAdmin
        .from('user_fuentes_suscripciones')
        .select('fuente_id')
        .eq('user_id', ownerId)

      if (suscripciones && suscripciones.length > 0) {
        subscribedFuenteIds = suscripciones.map(s => s.fuente_id)
        console.log(`📰 Usuario tiene ${subscribedFuenteIds.length} fuentes suscritas`)
      }
    }

    const { timeFrame, region, category, urgentOnly } = await request.json()

    console.log('Fetching breaking news:', { timeFrame, region, category, urgentOnly, hasSubscriptions: subscribedFuenteIds.length > 0 })

    // Construir query a 'noticias_scrapeadas'
    let query = supabaseAdmin
      .from('noticias_scrapeadas')
      .select('*')
      .order('fecha_publicacion', { ascending: false })
      .limit(50)

    // Filtro por suscripciones (si hay usuario autenticado con suscripciones)
    if (subscribedFuenteIds.length > 0) {
      query = query.in('fuente_id', subscribedFuenteIds)
    }

    // Filtro por tiempo (horas)
    if (timeFrame) {
      const startDate = new Date()
      startDate.setHours(startDate.getHours() - timeFrame)
      query = query.gte('fecha_publicacion', startDate.toISOString())
    }

    // Filtro por región
    if (region && region !== 'all') {
      query = query.eq('region', region)
    }

    // Filtro por categoría
    if (category && category !== 'all') {
      query = query.eq('categoria', category)
    }

    // Filtro por urgencia
    if (urgentOnly) {
      query = query.eq('prioridad', 'alta')
    }

    const { data: newsItems, error } = await query

    if (error) {
      console.error('Error fetching news from DB:', error)
      throw error
    }

    // Mapear a formato frontend
    const formattedNews = newsItems?.map(item => ({
      id: item.id,
      title: item.titulo,
      summary: item.resumen || item.contenido?.substring(0, 150) + '...',
      content: item.contenido,
      source: item.fuente,
      url: item.url,
      publishedAt: item.fecha_publicacion,
      region: item.region,
      category: item.categoria,
      urgency: item.prioridad === 'alta' ? 'high' : item.prioridad === 'media' ? 'medium' : 'low',
      sentiment: item.sentimiento === 'positivo' ? 'positive' : item.sentimiento === 'negativo' ? 'negative' : 'neutral'
    })) || []

    return NextResponse.json({
      success: true,
      news: formattedNews,
      metadata: {
        count: formattedNews.length,
        filters: { timeFrame, region, category, urgentOnly }
      }
    })

  } catch (error) {
    console.error('Error in breaking-news API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
