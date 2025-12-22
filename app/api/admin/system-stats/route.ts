/**
 * API: /api/admin/system-stats
 * Estadísticas globales del sistema para Super Admin
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase-auth'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }

        // Solo super_admin puede ver estadísticas globales
        if (user.role !== 'super_admin') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        // Obtener estadísticas globales
        const [
            { count: totalAdmins },
            { count: totalUsers },
            { count: totalNoticieros },
            { count: totalNoticias }
        ] = await Promise.all([
            supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
            supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'user'),
            supabaseAdmin.from('noticieros').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('noticias_scrapeadas').select('*', { count: 'exact', head: true })
        ])

        // Calcular costos del mes actual
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const { data: logsTokens } = await supabaseAdmin
            .from('logs_tokens')
            .select('costo')
            .gte('created_at', startOfMonth.toISOString())

        const totalCostMonth = logsTokens?.reduce((sum, log) => sum + (log.costo || 0), 0) || 0

        return NextResponse.json({
            success: true,
            stats: {
                totalAdmins: totalAdmins || 0,
                totalUsers: totalUsers || 0,
                totalNoticieros: totalNoticieros || 0,
                totalNoticias: totalNoticias || 0,
                totalCostMonth: totalCostMonth
            }
        })

    } catch (error) {
        console.error('Error en system-stats:', error)
        return NextResponse.json(
            { error: 'Error obteniendo estadísticas' },
            { status: 500 }
        )
    }
}
