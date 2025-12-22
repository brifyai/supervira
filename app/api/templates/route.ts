
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseSession } from '@/lib/supabase-server'
import { createNewscastTemplate, getUserNewscastTemplates } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getSupabaseSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const templates = await getUserNewscastTemplates(session.user.id)

    return NextResponse.json({
      success: true,
      templates
    })

  } catch (error) {
    console.error('Error fetching templates:', error)
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
      description,
      region,
      radio_station,
      duration_minutes,
      voice_provider,
      voice_id,
      include_weather,
      include_time,
      ad_frequency,
      categories,
      configuration
    } = body

    // Validaciones
    if (!name || !region) {
      return NextResponse.json(
        { error: 'Nombre y región son requeridos' },
        { status: 400 }
      )
    }

    const templateData = {
      name,
      description,
      region,
      radio_station,
      duration_minutes: duration_minutes || 15,
      voice_provider: voice_provider || 'openai',
      voice_id: voice_id || 'nova',
      include_weather: include_weather !== false,
      include_time: include_time !== false,
      ad_frequency: ad_frequency || 2,
      categories: categories || [],
      configuration: configuration || {},
      user_id: session.user.id
    }

    const template = await createNewscastTemplate(templateData)

    if (!template) {
      return NextResponse.json(
        { error: 'Error al crear plantilla' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      template
    })

  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
