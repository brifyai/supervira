import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { scrapeSingleSource, type FuenteFinal, type ScrapingResult } from '@/lib/scraping-service'

/**
 * API Endpoint para scrapear una fuente individual
 * POST /api/scrape-source
 * Body: { fuente_id: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { fuente_id } = body

        if (!fuente_id) {
            return NextResponse.json(
                { error: 'fuente_id es requerido' },
                { status: 400 }
            )
        }

        // Obtener la fuente de la BD
        const { data: fuente, error } = await supabase
            .from('fuentes_final')
            .select('*')
            .eq('id', fuente_id)
            .single()

        if (error || !fuente) {
            return NextResponse.json(
                { error: 'Fuente no encontrada' },
                { status: 404 }
            )
        }

        if (!fuente.esta_activo) {
            return NextResponse.json(
                { error: 'Fuente no está activa' },
                { status: 400 }
            )
        }

        console.log(`🔍 Iniciando scraping de: ${fuente.nombre_fuente}`)

        // Ejecutar scraping usando la función exportada
        const result = await scrapeSingleSource(fuente as FuenteFinal)

        return NextResponse.json(result)

    } catch (error) {
        console.error('❌ Error en API de scrape-source:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Error interno del servidor',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
