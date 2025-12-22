// Test directo de ScrapingBee con Emol
const testScrapingBee = async () => {
    console.log('🧪 Probando ScrapingBee con Emol...\n')

    const apiKey = process.env.SCRAPINGBEE_API_KEY || process.env.NEXT_PUBLIC_SCRAPINGBEE_API_KEY

    if (!apiKey) {
        console.error('❌ SCRAPINGBEE_API_KEY no configurada')
        return
    }

    const url = new URL('https://app.scrapingbee.com/api/v1/')
    url.searchParams.append('api_key', apiKey)
    url.searchParams.append('url', 'https://www.emol.com')
    url.searchParams.append('render_js', 'false')
    url.searchParams.append('premium_proxy', 'false')
    url.searchParams.append('country_code', 'cl')

    // Probar sin extract_rules primero para ver el HTML
    console.log('📡 Llamando a ScrapingBee...')

    try {
        const response = await fetch(url.toString())

        console.log(`📊 Status: ${response.status}`)
        console.log(`📊 Créditos usados: ${response.headers.get('spb-cost') || 'unknown'}`)

        if (!response.ok) {
            console.error(`❌ Error: ${response.status}`)
            const text = await response.text()
            console.error(text)
            return
        }

        const html = await response.text()
        console.log(`📊 HTML Length: ${html.length} caracteres\n`)

        // Buscar patrones comunes de noticias en el HTML
        console.log('🔍 Buscando patrones de noticias...\n')

        const patterns = [
            { name: 'article tags', regex: /<article[^>]*>/gi },
            { name: 'news classes', regex: /class="[^"]*noticia[^"]*"/gi },
            { name: 'story classes', regex: /class="[^"]*story[^"]*"/gi },
            { name: 'item classes', regex: /class="[^"]*item[^"]*"/gi },
            { name: 'h2 headlines', regex: /<h2[^>]*>.*?<\/h2>/gi },
            { name: 'h3 headlines', regex: /<h3[^>]*>.*?<\/h3>/gi }
        ]

        patterns.forEach(({ name, regex }) => {
            const matches = html.match(regex)
            console.log(`${name}: ${matches ? matches.length : 0} encontrados`)
            if (matches && matches.length > 0) {
                console.log(`  Ejemplo: ${matches[0].substring(0, 100)}...`)
            }
        })

        // Guardar HTML para inspección
        const fs = require('fs')
        const path = require('path')
        const outputPath = path.join(process.cwd(), 'emol_scrapingbee_output.html')
        fs.writeFileSync(outputPath, html)
        console.log(`\n💾 HTML guardado en: ${outputPath}`)
        console.log('   Abre este archivo para ver la estructura y ajustar los selectores')

    } catch (error) {
        console.error('❌ Error:', error)
    }
}

testScrapingBee()
