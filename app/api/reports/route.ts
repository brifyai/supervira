
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseSession } from '@/lib/supabase-server'
import { createNewsReport, getUserNewsReports, updateNewsReport } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getSupabaseSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const reports = await getUserNewsReports(session.user.id, limit)

    return NextResponse.json({
      success: true,
      reports
    })

  } catch (error) {
    console.error('Error fetching reports:', error)
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
      title,
      content,
      timeline_data,
      template_id,
      radio_station_id,
      metadata
    } = body

    // Validaciones
    if (!title) {
      return NextResponse.json(
        { error: 'Título es requerido' },
        { status: 400 }
      )
    }

    const reportData = {
      title,
      content,
      timeline_data,
      template_id,
      radio_station_id,
      metadata: metadata || {},
      status: 'generated',
      generation_cost: 0,
      token_count: 0,
      user_id: session.user.id
    }

    const report = await createNewsReport(reportData)

    if (!report) {
      return NextResponse.json(
        { error: 'Error al crear reporte' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      report
    })

  } catch (error) {
    console.error('Error creating report:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
