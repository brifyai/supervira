// Test directo del RSS de Emol
const testEmolRSS = async () => {
    console.log('🧪 Probando RSS de Emol directamente...\n')

    try {
        const rssUrl = 'https://www.emol.com/rss/rss.asp'
        console.log(`📡 Fetching: ${rssUrl}`)

        const response = await fetch(rssUrl)
        console.log(`📊 Status: ${response.status}`)
        console.log(`📊 Content-Type: ${response.headers.get('content-type')}`)

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }

        const xmlText = await response.text()
        console.log(`📊 XML Length: ${xmlText.length} caracteres`)
        console.log(`\n📄 Primeros 500 caracteres del XML:`)
        console.log(xmlText.substring(0, 500))
        console.log('\n...\n')

        // Parsear XML
        const { JSDOM } = require('jsdom')
        const dom = new JSDOM(xmlText, { contentType: 'text/xml' })
        const doc = dom.window.document

        const items = doc.querySelectorAll('item')
        console.log(`📰 Items encontrados: ${items.length}\n`)

        if (items.length > 0) {
            console.log('📋 Primeras 5 noticias:\n')
            Array.from(items).slice(0, 5).forEach((item, index) => {
                const title = item.querySelector('title')?.textContent || 'Sin título'
                const link = item.querySelector('link')?.textContent || ''
                const description = item.querySelector('description')?.textContent || ''
                const pubDate = item.querySelector('pubDate')?.textContent || ''

                console.log(`${index + 1}. ${title}`)
                console.log(`   Link: ${link}`)
                console.log(`   Fecha: ${pubDate}`)
                console.log(`   Descripción: ${description.substring(0, 100)}...`)
                console.log('')
            })
        }

        console.log('✅ RSS parseado correctamente')

    } catch (error) {
        console.error('❌ Error:', error)
    }
}

testEmolRSS()
