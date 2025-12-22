import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseSession, supabaseAdmin } from '@/lib/supabase-server'

// ==================================================
// ENDPOINT UNIFICADO: Scraping + Generación de Noticiero
// ==================================================
// Resuelve el problema de "Invalid Refresh Token: Already Used"
// al validar la sesión UNA SOLA VEZ al inicio y luego ejecutar
// todo el proceso (scraping + generación) en una sola llamada.
// ==================================================

export async function POST(request: NextRequest) {
    try {
        const config = await request.json()

        // ========================================
        // 1. AUTENTICACIÓN - UNA SOLA VEZ
        // ========================================
        const session = await getSupabaseSession()
        let userId = session?.user?.id
        let userEmail = session?.user?.email

        // Fallback: userId del body (para cuando sesión ya expiró al inicio)
        if (!userId && config.userId) {
            console.log('⚠️ Sesión no disponible, usando userId del body...')
            const { data: userCheck, error: userError } = await supabaseAdmin
                .from('users')
                .select('id, email, role')
                .eq('id', config.userId)
                .single()

            if (userCheck && !userError) {
                userId = config.userId
                userEmail = userCheck.email
                console.log(`✅ Fallback exitoso: Usuario verificado ${userCheck.email}`)
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        console.log(`🚀 [create-full-newscast] Iniciando para usuario: ${userEmail}`)

        // ========================================
        // 2. SCRAPING PROFUNDO
        // ========================================
        const {
            noticias,
            region,
            categories,
            categoryConfig,
            specificNewsUrls,
            targetDuration = 900,
            generateAudioNow = false,
            voiceModel,
            voiceWPM = 150,
            adCount = 2,
            audioConfig
        } = config

        if (noticias && noticias.length > 0) {
            console.log(`📄 Ejecutando scraping de ${noticias.length} noticias...`)

            // Importar y ejecutar la lógica de scraping
            const scrapeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/scraping/deep`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    noticias,
                    region: region || 'Nacional'
                })
            })

            if (!scrapeResponse.ok) {
                console.warn('⚠️ Scraping falló pero continuando...')
            } else {
                const scrapeResult = await scrapeResponse.json()
                console.log(`✅ Scraping completado: ${scrapeResult.successCount || 0} noticias`)
            }
        }

        // ========================================
        // 3. GENERAR NOTICIERO
        // ========================================
        console.log(`📰 Generando noticiero...`)

        // Llamar al endpoint de generación con el userId ya validado
        const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-newscast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                region,
                categories,
                categoryConfig,
                specificNewsUrls,
                targetDuration,
                generateAudioNow,
                voiceModel,
                voiceWPM,
                adCount,
                audioConfig,
                userId // ✅ Pasar userId para fallback
            })
        })

        const generateResult = await generateResponse.json()

        if (!generateResponse.ok) {
            console.error('❌ Error generando noticiero:', generateResult.error)
            return NextResponse.json({
                success: false,
                error: generateResult.error || 'Error al generar noticiero'
            }, { status: generateResponse.status })
        }

        console.log(`✅ Noticiero generado: ${generateResult.newscastId}`)

        // ========================================
        // 4. RETORNAR RESULTADO
        // ========================================
        return NextResponse.json({
            success: true,
            newscastId: generateResult.newscastId,
            noticieroId: generateResult.noticieroId,
            timeline: generateResult.timeline,
            totalDuration: generateResult.totalDuration,
            totalCost: generateResult.totalCost,
            totalTokens: generateResult.totalTokens
        })

    } catch (error: any) {
        console.error('❌ Error en create-full-newscast:', error)
        return NextResponse.json({
            success: false,
            error: error.message || 'Error interno del servidor'
        }, { status: 500 })
    }
}
