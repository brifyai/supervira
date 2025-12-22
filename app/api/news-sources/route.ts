
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseSession } from '@/lib/supabase-server'
import { createNewsSource, getUserNewsSources, getNewsSourcesByRegion } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const region = searchParams.get('region')
    const userOnly = searchParams.get('userOnly') === 'true'

    if (userOnly) {
      const session = await getSupabaseSession()
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        )
      }

      const sources = await getUserNewsSources(session.user.id)
      return NextResponse.json({
        success: true,
        sources
      })
    }

    if (region) {
      const sources = await getNewsSourcesByRegion(region)
      return NextResponse.json({
        success: true,
        sources
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Parámetros insuficientes'
    }, { status: 400 })

  } catch (error) {
    console.error('Error fetching news sources:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSupabaseSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      name,
      url,
      rss_url,
      region,
      category,
      scraping_config
    } = body

    // Validaciones
    if (!name || !url) {
      return NextResponse.json(
        { error: 'Nombre y URL son requeridos' },
        { status: 400 }
      )
    }

    // Validar formato de URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'URL inválida' },
        { status: 400 }
      )
    }

    const sourceData = {
      name,
      url,
      rss_url,
      region: region || 'nacional',
      category: category || 'general',
      is_active: true,
      scraping_config: scraping_config || {},
      success_rate: 1.0,
      user_id: session.user.id
    }

    const source = await createNewsSource(sourceData)

    if (!source) {
      return NextResponse.json(
        { error: 'Error al crear fuente de noticias' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      source
    })

  } catch (error) {
    console.error('Error creating news source:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
