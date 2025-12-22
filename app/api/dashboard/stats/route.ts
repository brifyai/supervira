export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseSession, supabaseAdmin } from '@/lib/supabase-server'

const supabase = supabaseAdmin

export async function GET(request: NextRequest) {
    try {
        const session = await getSupabaseSession()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // Obtener rol del usuario
        const { data: currentUser } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single()

        const userRole = currentUser?.role || 'user'

        // Solo admin y super_admin pueden ver estadísticas
        if (userRole !== 'admin' && userRole !== 'super_admin') {
            return NextResponse.json({ error: 'Requiere rol de administrador' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const period = parseInt(searchParams.get('period') || '7')

        // Calcular fecha de inicio del periodo
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - period)
        const startDateStr = startDate.toISOString()

        // 1. Obtener métricas de noticieros
        // Si es super_admin: ve todos. Si es admin: solo los suyos y de sus sub-usuarios
        let newsQuery = supabase
            .from('noticieros')
            .select('id, costo_generacion, total_tokens, region, created_at, user_id')
            .gte('created_at', startDateStr)

        if (userRole === 'admin') {
            // Obtener IDs de sub-usuarios del admin
            const { data: subUsers } = await supabase
                .from('users')
                .select('id')
                .eq('admin_id', session.user.id)

            const userIds = [session.user.id, ...(subUsers?.map(u => u.id) || [])]
            newsQuery = newsQuery.in('user_id', userIds)
        }

        const { data: newsData, error: newsError } = await newsQuery

        if (newsError) throw newsError

        const totalNewsReports = newsData?.length || 0
        const totalPeriodCost = newsData?.reduce((sum, item) => sum + (Number(item.costo_generacion) || 0), 0) || 0
        const totalTokens = newsData?.reduce((sum, item) => sum + (item.total_tokens || 0), 0) || 0

        // 2. Calcular Radio más activa (Región con más noticieros)
        const regionCounts: Record<string, number> = {}
        newsData?.forEach(item => {
            const region = item.region || 'Desconocida'
            regionCounts[region] = (regionCounts[region] || 0) + 1
        })

        let mostActiveRadio = 'N/A'
        let maxCount = 0
        Object.entries(regionCounts).forEach(([region, count]) => {
            if (count > maxCount) {
                maxCount = count
                mostActiveRadio = region
            }
        })

        // 3. Obtener líderes de producción (Agrupado por región/radio)
        // Nota: Como no tenemos una tabla de 'radios' separada vinculada directamente en este query simple,
        // usaremos las regiones como proxy de "Radios" para este gráfico.
        const leaders = Object.entries(regionCounts)
            .map(([region, count], index) => ({
                rank: index + 1,
                radioName: `Radio ${region}`,
                newsCount: count,
                tokens: newsData?.filter(n => n.region === region).reduce((sum, n) => sum + (n.total_tokens || 0), 0) || 0
            }))
            .sort((a, b) => b.newsCount - a.newsCount)
            .slice(0, 5) // Top 5

        // 4. Desglose de Recursos (Estimado basado en logs de tokens si existen, o heurística)
        // Intentamos obtener de token_usage si hay datos detallados
        const { data: usageData } = await supabase
            .from('uso_tokens')
            .select('*')
            .gte('created_at', startDateStr)

        let resources = {
            extractionTokens: 0,
            extractionCost: 0,
            curationTokens: 0,
            curationCost: 0,
            audioTokens: 0,
            audioCost: 0
        }

        if (usageData && usageData.length > 0) {
            usageData.forEach(usage => {
                if (usage.service === 'scraping' || usage.operation === 'extraction') {
                    resources.extractionTokens += usage.tokens_used
                    resources.extractionCost += usage.cost
                } else if (usage.service === 'gpt' || usage.service === 'chutes' || usage.operation === 'curation' || usage.operation === 'humanizacion') {
                    resources.curationTokens += usage.tokens_used
                    resources.curationCost += usage.cost
                } else if (usage.service === 'tts' || usage.operation === 'audio') {
                    resources.audioTokens += usage.tokens_used
                    resources.audioCost += usage.cost
                }
            })
        } else {
            // Fallback: Distribuir el total de noticieros (heurística simple si no hay logs detallados)
            // Asumimos: 20% extracción, 40% curación, 40% audio del total de tokens/costo
            resources = {
                extractionTokens: Math.floor(totalTokens * 0.2),
                extractionCost: totalPeriodCost * 0.2,
                curationTokens: Math.floor(totalTokens * 0.4),
                curationCost: totalPeriodCost * 0.4,
                audioTokens: Math.floor(totalTokens * 0.4),
                audioCost: totalPeriodCost * 0.4
            }
        }

        // 5. Reporte Publicitario
        const { data: campaigns } = await supabase
            .from('campanas_publicitarias')
            .select('nombre, reproducciones')
            .order('reproducciones', { ascending: false })
            .limit(5)

        const advertisingStats = campaigns?.map(c => ({
            name: c.nombre,
            reproductions: c.reproducciones || 0
        })) || []

        return NextResponse.json({
            metrics: {
                totalNewsReports,
                totalPeriodCost,
                totalTokens: totalTokens > 1000000 ? `${(totalTokens / 1000000).toFixed(1)}M` : totalTokens.toLocaleString(),
                mostActiveRadio,
                totalPeriodRevenue: 0 // Pagos fuera de alcance
            },
            leaders,
            resources,
            advertising: advertisingStats
        })

    } catch (error: any) {
        console.error('Error en dashboard stats:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
