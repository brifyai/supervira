export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseSession } from '@/lib/supabase-server'
import { getTokenUsageMetrics } from '@/lib/usage-logger'

export async function GET(request: NextRequest) {
    try {
        const session = await getSupabaseSession()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Obtener parámetros de query
        const searchParams = request.nextUrl.searchParams
        const period = searchParams.get('period') || '7' // días por defecto

        // Calcular fechas
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - parseInt(period))

        // Solo para admin, ver todo. Para usuarios, solo sus tokens
        const userId = session.user.role === 'admin' ? undefined : session.user.id

        const metrics = await getTokenUsageMetrics(startDate, endDate, userId)

        return NextResponse.json({
            success: true,
            period: `${period} días`,
            metrics
        })

    } catch (error) {
        console.error('Error getting token usage metrics:', error)
        return NextResponse.json(
            { error: 'Error fetching metrics' },
            { status: 500 }
        )
    }
}
