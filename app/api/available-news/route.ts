export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Función para normalizar la región
async function normalizeRegion(inputRegion: string): Promise<string | null> {
    if (!inputRegion) return null

    // 1. Buscar coincidencia exacta (case insensitive)
    const { data, error } = await supabase
        .from('configuraciones_regiones')
        .select('region')
        .ilike('region', inputRegion)
        .maybeSingle()

    if (data) return data.region

    // 2. Si no encuentra, intentar buscar por coincidencia parcial
    const { data: partialData } = await supabase
        .from('configuraciones_regiones')
        .select('region')
        .ilike('region', `%${inputRegion}%`)
        .limit(1)
        .maybeSingle()

    if (partialData) return partialData.region

    return null
}

/**
 * GET /api/available-news
 * Obtiene noticias scrapeadas disponibles para agregar al timeline
 * 
 * Query params:
 * - region: string (opcional, si no se especifica y hay category='nacionales' busca noticias nacionales)
 * - category: string (opcional)
 * - limit: number (opcional, default 50)
 * - offset: number (opcional, default 0)
 * - search: string (opcional, buscar en título)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const region = searchParams.get('region')
        const category = searchParams.get('category')
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')
        const search = searchParams.get('search')

        console.log(`📰 Buscando noticias: region=${region}, category=${category}, limit=${limit}`)

        let normalizedRegion: string | null = null

        // Validar y normalizar región si se proporciona
        if (region) {
            normalizedRegion = await normalizeRegion(region)

            if (!normalizedRegion) {
                return NextResponse.json(
                    { error: `Región inválida: ${region}` },
                    { status: 400 }
                )
            }

            // Verificar si está activa (usando la región normalizada)
            const { data: regionConfig } = await supabase
                .from('configuraciones_regiones')
                .select('esta_activo')
                .eq('region', normalizedRegion)
                .single()

            if (regionConfig && !regionConfig.esta_activo) {
                return NextResponse.json(
                    { error: `Región ${normalizedRegion} está desactivada` },
                    { status: 400 }
                )
            }
        }

        // Construir query base
        let query = supabase
            .from('noticias_scrapeadas')
            .select('*', { count: 'exact' })
            .eq('fue_procesada', false) // Solo noticias no procesadas
            .order('fecha_scraping', { ascending: false })
            .range(offset, offset + limit - 1)

        // Aplicar filtros
        if (normalizedRegion) {
            query = query.eq('region', normalizedRegion)
        }

        if (category) {
            query = query.eq('categoria', category)
        }

        if (search) {
            query = query.ilike('titulo', `%${search}%`)
        }

        const { data: news, error, count } = await query

        if (error) {
            console.error('Error obteniendo noticias:', error)
            return NextResponse.json(
                { error: 'Error obteniendo noticias' },
                { status: 500 }
            )
        }

        console.log(`✅ ${news?.length || 0} noticias encontradas de ${count} totales`)

        return NextResponse.json({
            success: true,
            news: news || [],
            total: count || 0,
            limit,
            offset
        })

    } catch (error) {
        console.error('Error en /api/available-news:', error)
        return NextResponse.json(
            {
                error: 'Error interno del servidor',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
