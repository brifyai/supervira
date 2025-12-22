// ==================================================
// TEST DE SCRAPING - EMOL
// ==================================================
// Script para probar el scraping de Emol y guardar en DB
// ==================================================

import { supabase } from '../lib/supabase'

// Configuración de la fuente de prueba
const EMOL_TEST_SOURCE = {
    id: 'test-emol-' + Date.now(),
    region: 'Metropolitana de Santiago',
    nombre_fuente: 'Emol (Test)',
    url: 'https://www.emol.com',
    rss_url: 'https://www.emol.com/rss/rss.asp',
    esta_activo: true,
    requiere_js: false,
    frecuencia_scraping_minutos: 60
}

async function testScrapingEmol() {
    console.log('🧪 Iniciando test de scraping con Emol...\n')

    try {
        // 1. Insertar fuente de prueba en la BD
        console.log('📝 Insertando fuente de prueba en la BD...')
        const { data: insertedSource, error: insertError } = await supabase
            .from('fuentes_final')
            .insert(EMOL_TEST_SOURCE)
            .select()
            .single()

        if (insertError) {
            console.error('❌ Error insertando fuente:', insertError)
            return
        }

        console.log('✅ Fuente insertada:', insertedSource.nombre_fuente)
        console.log(`   ID: ${insertedSource.id}`)
        console.log(`   RSS: ${insertedSource.rss_url}\n`)

        // 2. Llamar al servicio de scraping
        console.log('🔄 Ejecutando scraping...')

        // Importar dinámicamente para evitar problemas de SSR
        const { scrapeSingleSource } = await import('../lib/scraping-service')

        const result = await scrapeSingleSource(insertedSource)

        // 3. Mostrar resultados
        console.log('\n📊 RESULTADOS DEL SCRAPING:')
        console.log('='.repeat(50))
        console.log(`✅ Éxito: ${result.success}`)
        console.log(`📰 Noticias encontradas: ${result.noticias_encontradas}`)
        console.log(`🆕 Noticias nuevas: ${result.noticias_nuevas}`)
        console.log(`🔁 Noticias duplicadas: ${result.noticias_duplicadas}`)
        console.log(`📡 Método: ${result.metodo}`)
        console.log(`💳 Créditos usados: ${result.credits_used}`)
        console.log(`💰 Costo: $${result.cost_usd.toFixed(6)} USD`)
        console.log(`⏱️  Tiempo: ${(result.execution_time_ms / 1000).toFixed(2)}s`)

        if (result.error) {
            console.log(`❌ Error: ${result.error}`)
        }

        // 4. Verificar noticias en la BD
        console.log('\n🔍 Verificando noticias en la base de datos...')
        const { data: savedNews, error: newsError } = await supabase
            .from('noticias_scrapeadas')
            .select('*')
            .eq('fuente', insertedSource.nombre_fuente)
            .order('fecha_scraping', { ascending: false })
            .limit(5)

        if (newsError) {
            console.error('❌ Error consultando noticias:', newsError)
        } else {
            console.log(`\n📋 Últimas ${savedNews?.length || 0} noticias guardadas:`)
            savedNews?.forEach((noticia, index) => {
                console.log(`\n${index + 1}. ${noticia.titulo}`)
                console.log(`   Categoría: ${noticia.categoria}`)
                console.log(`   Región: ${noticia.region}`)
                console.log(`   URL: ${noticia.url}`)
                console.log(`   Fecha: ${new Date(noticia.fecha_publicacion).toLocaleString('es-CL')}`)
            })
        }

        // 5. Verificar logs de scraping
        console.log('\n📝 Verificando logs de scraping...')
        const { data: logs, error: logsError } = await supabase
            .from('logs_scraping')
            .select('*')
            .eq('fuente_id', insertedSource.id)
            .order('created_at', { ascending: false })
            .limit(1)

        if (logsError) {
            console.error('❌ Error consultando logs:', logsError)
        } else if (logs && logs.length > 0) {
            const log = logs[0]
            console.log('\n✅ Log de scraping registrado:')
            console.log(`   Estado: ${log.estado}`)
            console.log(`   Noticias encontradas: ${log.noticias_encontradas}`)
            console.log(`   Noticias nuevas: ${log.noticias_nuevas}`)
            console.log(`   Método: ${log.metodo_scraping}`)
            console.log(`   Créditos: ${log.scrapingbee_credits_usados}`)
            console.log(`   Costo: $${log.costo_estimado_usd}`)
        }

        // 6. Verificar métricas de la fuente
        console.log('\n📈 Verificando métricas de la fuente...')
        const { data: updatedSource, error: sourceError } = await supabase
            .from('fuentes_final')
            .select('*')
            .eq('id', insertedSource.id)
            .single()

        if (sourceError) {
            console.error('❌ Error consultando fuente:', sourceError)
        } else {
            console.log('\n✅ Métricas actualizadas:')
            console.log(`   Total scrapes: ${updatedSource.total_scrapes}`)
            console.log(`   Scrapes exitosos: ${updatedSource.scrapes_exitosos}`)
            console.log(`   Scrapes fallidos: ${updatedSource.scrapes_fallidos}`)
            console.log(`   Tasa de éxito: ${updatedSource.tasa_exito}%`)
            console.log(`   Última ejecución: ${updatedSource.ultima_ejecucion ? new Date(updatedSource.ultima_ejecucion).toLocaleString('es-CL') : 'N/A'}`)
        }

        console.log('\n' + '='.repeat(50))
        console.log('✅ TEST COMPLETADO EXITOSAMENTE')
        console.log('='.repeat(50))

        // 7. Limpiar (opcional - comentar si quieres mantener los datos)
        console.log('\n🧹 Limpiando datos de prueba...')

        // Eliminar fuente de prueba
        await supabase
            .from('fuentes_final')
            .delete()
            .eq('id', insertedSource.id)

        console.log('✅ Fuente de prueba eliminada')
        console.log('ℹ️  Las noticias y logs se mantienen en la BD para revisión')

    } catch (error) {
        console.error('\n❌ ERROR EN EL TEST:', error)
        if (error instanceof Error) {
            console.error('   Mensaje:', error.message)
            console.error('   Stack:', error.stack)
        }
    }
}

// Ejecutar test
testScrapingEmol()
    .then(() => {
        console.log('\n✅ Script finalizado')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Error fatal:', error)
        process.exit(1)
    })
