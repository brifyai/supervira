// ==================================================
// VIRA - RSS Parser
// ==================================================
// Parsea feeds RSS/Atom para obtener noticias
// Usado como alternativa gratuita a ScrapingBee
// ==================================================

export interface RSSItem {
    titulo: string
    url: string
    contenido: string
    resumen: string
    fecha: Date | null
    imagen_url?: string
    categoria?: string
    fuente: string
}

export interface RSSFeed {
    titulo: string
    descripcion: string
    url: string
    items: RSSItem[]
}

/**
 * Parsea un feed RSS/Atom y extrae las noticias
 */
export async function parseRSSFeed(rssUrl: string, fuenteNombre: string): Promise<RSSFeed> {
    console.log(`📡 Parseando RSS: ${rssUrl}`)

    try {
        const response = await fetch(rssUrl, {
            headers: {
                'User-Agent': 'VIRA NewsBot/1.0 (https://vira.cl)',
                'Accept': 'application/rss+xml, application/xml, text/xml'
            }
        })

        if (!response.ok) {
            throw new Error(`Error fetching RSS: ${response.status}`)
        }

        const xmlText = await response.text()

        // Parsear XML manualmente (sin dependencias externas)
        const items = parseRSSItems(xmlText, fuenteNombre)

        // Extraer metadata del canal
        const titleMatch = xmlText.match(/<channel>[\s\S]*?<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)
        const descMatch = xmlText.match(/<channel>[\s\S]*?<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/i)

        console.log(`✅ RSS parseado: ${items.length} noticias encontradas`)

        return {
            titulo: cleanCDATA(titleMatch?.[1] || fuenteNombre),
            descripcion: cleanCDATA(descMatch?.[1] || ''),
            url: rssUrl,
            items
        }

    } catch (error) {
        console.error(`❌ Error parseando RSS ${rssUrl}:`, error)
        return {
            titulo: fuenteNombre,
            descripcion: '',
            url: rssUrl,
            items: []
        }
    }
}

/**
 * Parsea los items de un feed RSS
 */
function parseRSSItems(xmlText: string, fuenteNombre: string): RSSItem[] {
    const items: RSSItem[] = []

    // Regex para extraer items (funciona con RSS 2.0 y Atom)
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi

    // Intentar RSS 2.0 primero
    let matches = xmlText.match(itemRegex)

    // Si no hay items RSS, intentar Atom
    if (!matches || matches.length === 0) {
        matches = xmlText.match(entryRegex)
    }

    if (!matches) {
        return items
    }

    for (const itemXml of matches.slice(0, 20)) { // Limitar a 20 items
        const item = parseRSSItem(itemXml, fuenteNombre)
        if (item) {
            items.push(item)
        }
    }

    return items
}

/**
 * Parsea un item individual de RSS
 */
function parseRSSItem(itemXml: string, fuenteNombre: string): RSSItem | null {
    // Extraer campos
    const titulo = extractField(itemXml, 'title')
    const link = extractLink(itemXml)
    const description = extractField(itemXml, 'description') || extractField(itemXml, 'summary')
    const content = extractField(itemXml, 'content:encoded') || extractField(itemXml, 'content')
    const pubDate = extractField(itemXml, 'pubDate') || extractField(itemXml, 'published') || extractField(itemXml, 'updated')
    const category = extractField(itemXml, 'category')
    const imagen = extractImage(itemXml)

    if (!titulo || !link) {
        return null
    }

    // El contenido es content:encoded (si existe) o description
    const contenidoFinal = cleanHTML(content || description || '')
    const resumenFinal = cleanHTML(description || '')

    return {
        titulo: cleanCDATA(titulo),
        url: link,
        contenido: contenidoFinal,
        resumen: resumenFinal.substring(0, 300),
        fecha: pubDate ? new Date(pubDate) : null,
        imagen_url: imagen,
        categoria: cleanCDATA(category || 'general'),
        fuente: fuenteNombre
    }
}

/**
 * Extrae un campo del XML
 */
function extractField(xml: string, fieldName: string): string | null {
    // Regex que maneja CDATA y texto normal
    const regex = new RegExp(`<${fieldName}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${fieldName}>`, 'i')
    const match = xml.match(regex)
    return match ? match[1].trim() : null
}

/**
 * Extrae el link (puede estar como atributo o contenido)
 */
function extractLink(xml: string): string {
    // RSS 2.0: <link>url</link>
    const linkContent = extractField(xml, 'link')
    if (linkContent && linkContent.startsWith('http')) {
        return linkContent
    }

    // Atom: <link href="url" />
    const hrefMatch = xml.match(/<link[^>]+href=["']([^"']+)["']/i)
    if (hrefMatch) {
        return hrefMatch[1]
    }

    // GUID como fallback
    const guidMatch = xml.match(/<guid[^>]*>([^<]+)<\/guid>/i)
    if (guidMatch && guidMatch[1].startsWith('http')) {
        return guidMatch[1]
    }

    return ''
}

/**
 * Extrae imagen del item
 */
function extractImage(xml: string): string | undefined {
    // Buscar en media:content
    const mediaMatch = xml.match(/<media:content[^>]+url=["']([^"']+)["']/i)
    if (mediaMatch) return mediaMatch[1]

    // Buscar en enclosure
    const enclosureMatch = xml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image/i)
    if (enclosureMatch) return enclosureMatch[1]

    // Buscar en content (imagen embebida)
    const imgMatch = xml.match(/<img[^>]+src=["']([^"']+)["']/i)
    if (imgMatch) return imgMatch[1]

    return undefined
}

/**
 * Limpia contenido CDATA
 */
function cleanCDATA(text: string): string {
    return text
        .replace(/^<!\[CDATA\[/, '')
        .replace(/\]\]>$/, '')
        .trim()
}

/**
 * Limpia HTML y extrae texto
 */
function cleanHTML(html: string): string {
    return html
        // Eliminar CDATA
        .replace(/<!\[CDATA\[/g, '')
        .replace(/\]\]>/g, '')
        // Eliminar scripts y estilos
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        // Reemplazar <br> y <p> con saltos de línea
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        // Eliminar todas las etiquetas HTML
        .replace(/<[^>]+>/g, '')
        // Decodificar entidades HTML comunes
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#8230;/g, '...')
        .replace(/&#8211;/g, '-')
        .replace(/&#8217;/g, "'")
        // Limpiar espacios múltiples
        .replace(/\s+/g, ' ')
        .trim()
}
