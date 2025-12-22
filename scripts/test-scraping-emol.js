// ==================================================
// TEST DE SCRAPING - EMOL
// ==================================================
// Prueba el scraping de Emol llamando al API endpoint
// ==================================================

const EMOL_ID = 'f5a0a3ea-a4f2-4b24-93d4-79c65fc05ec6'
const API_URL = 'http://localhost:3000/api/scrape-source'

async function testScrapingEmol() {
    console.log('🧪 Iniciando test de scraping con Emol...\n')
    console.log(`📝 Fuente ID: ${EMOL_ID}`)
    console.log(`📡 API URL: ${API_URL}\n`)

    try {
        console.log('🔄 Llamando al API...')
        const startTime = Date.now()

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fuente_id: EMOL_ID
            })
        })

        const responseTime = Date.now() - startTime

        console.log(`📊 Status: ${response.status}`)
        console.log(`⏱️  Tiempo de respuesta: ${responseTime}ms\n`)

        if (!response.ok) {
            const errorText = await response.text()
            console.error(`❌ Error HTTP ${response.status}:`)
            console.error(errorText)
            return
        }

        const result = await response.json()

        console.log('='.repeat(60))
        console.log('📊 RESULTADOS DEL SCRAPING')
        console.log('='.repeat(60))
        console.log(`✅ Éxito: ${result.success}`)
        console.log(`📰 Noticias encontradas: ${result.noticias_encontradas}`)
        console.log(`🆕 Noticias nuevas: ${result.noticias_nuevas}`)
        console.log(`🔁 Noticias duplicadas: ${result.noticias_duplicadas}`)
        console.log(`📡 Método: ${result.metodo}`)
        console.log(`💳 Créditos usados: ${result.credits_used}`)
        console.log(`💰 Costo: $${result.cost_usd.toFixed(6)} USD`)
        console.log(`⏱️  Tiempo de ejecución: ${(result.execution_time_ms / 1000).toFixed(2)}s`)

        if (result.error) {
            console.log(`❌ Error: ${result.error}`)
        }
        console.log('='.repeat(60))

        if (result.success && result.noticias_nuevas > 0) {
            console.log('\n✅ TEST EXITOSO - Noticias scrapeadas correctamente')
            console.log('\n🔍 Verifica las noticias en Supabase:')
            console.log('   SELECT * FROM noticias_scrapeadas WHERE fuente = \'Emol\' ORDER BY fecha_scraping DESC LIMIT 10;')
        } else if (result.success && result.noticias_encontradas === 0) {
            console.log('\n⚠️  ADVERTENCIA - No se encontraron noticias')
            console.log('   Posibles causas:')
            console.log('   - Los selectores CSS no coinciden con la estructura de Emol')
            console.log('   - El sitio está bloqueando ScrapingBee')
            console.log('   - El sitio requiere JavaScript (prueba con requiere_js=true)')
        } else if (result.success && result.noticias_nuevas === 0) {
            console.log('\n✅ TEST EXITOSO - Todas las noticias ya existían (duplicados)')
        } else {
            console.log('\n❌ TEST FALLIDO')
        }

    } catch (error) {
        console.error('\n❌ ERROR EN EL TEST:', error)
        if (error instanceof Error) {
            console.error('   Mensaje:', error.message)
            console.error('   Stack:', error.stack)
        }
    }
}

// Ejecutar test
console.log('🚀 Asegúrate de que el servidor esté corriendo en http://localhost:3000\n')
testScrapingEmol()
    .then(() => {
        console.log('\n✅ Script finalizado')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Error fatal:', error)
        process.exit(1)
    })
