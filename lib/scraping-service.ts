// ==================================================
// SERVICIO DE SCRAPING - SOLO SERVIDOR
// ==================================================
// Este archivo SOLO puede ejecutarse en el servidor
// Usa JSDOM que requiere módulos de Node.js
// No importar desde componentes cliente
// ==================================================

import 'server-only';

import { supabase } from './supabase'

// Tipos
export interface FuenteFinal {
    id: string
    region: string
    nombre_fuente: string
    url: string
    rss_url?: string
    esta_activo: boolean
    requiere_js?: boolean
    frecuencia_scraping_minutos: number
}

export interface ScrapingResult {
    success: boolean
    fuente_id: string
    region: string
    noticias_encontradas: number
    noticias_nuevas: number
    noticias_duplicadas: number
    metodo: 'scrapingbee'
    credits_used: number
    cost_usd: number
    execution_time_ms: number
    error?: string
}

// Constantes de costos de ScrapingBee
export const SCRAPINGBEE_COSTS = {
    BASE_REQUEST: 1,
    RENDER_JS: 4,
    PREMIUM_PROXY: 10,
    COUNTRY_CODE: 25,
    COST_PER_CREDIT: 0.000283
}

/**
 * Calcula los créditos de ScrapingBee según la configuración
 */
export function calculateScrapingBeeCredits(options: {
    render_js: boolean
    premium_proxy: boolean
    country_code?: string
}): number {
    let credits = SCRAPINGBEE_COSTS.BASE_REQUEST

    if (options.render_js) credits += SCRAPINGBEE_COSTS.RENDER_JS
    if (options.premium_proxy) credits += SCRAPINGBEE_COSTS.PREMIUM_PROXY
    if (options.country_code) credits += SCRAPINGBEE_COSTS.COUNTRY_CODE

    return credits
}

/**
 * Calcula el costo en USD basado en los créditos
 */
export function calculateCostUSD(credits: number): number {
    return credits * SCRAPINGBEE_COSTS.COST_PER_CREDIT
}

export async function getMonthlyScrapingMetrics() {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
        .from('logs_scraping')
        .select('*')
        .gte('created_at', startOfMonth.toISOString())

    if (error || !data) {
        return {
            total_credits_used: 0,
            total_cost_usd: 0,
            rss_requests: 0,
            scrapingbee_requests: 0,
            total_news: 0
        }
    }

    const metrics = data.reduce((acc, log) => {
        acc.total_credits_used += log.scrapingbee_credits_usados || 0
        acc.total_cost_usd += log.costo_estimado_usd || 0
        acc.total_news += log.noticias_nuevas || 0
        acc.scrapingbee_requests++

        return acc
    }, {
        total_credits_used: 0,
        total_cost_usd: 0,
        rss_requests: 0,
        scrapingbee_requests: 0,
        total_news: 0
    })

    return metrics
}

// ==================================================
// SCRAPING CORE FUNCTION
// ==================================================

/**
 * Scrapea una sola fuente usando ScrapingBee
 * SOLO SE EJECUTA EN EL SERVIDOR
 */
export async function scrapeSingleSource(source: FuenteFinal): Promise<ScrapingResult> {
    const startTime = Date.now()

    // Calcular créditos que se usarán
    const creditsUsed = calculateScrapingBeeCredits({
        render_js: source.requiere_js || false,
        premium_proxy: false,
        country_code: 'cl'
    })

    try {
        const apiKey = process.env.SCRAPINGBEE_API_KEY

        if (!apiKey) {
            throw new Error('SCRAPINGBEE_API_KEY no configurada')
        }

        // Construir URL de ScrapingBee - SIN extract_rules, obtenemos HTML completo
        const url = new URL('https://app.scrapingbee.com/api/v1/')
        url.searchParams.append('api_key', apiKey)
        url.searchParams.append('url', source.url)
        url.searchParams.append('render_js', source.requiere_js ? 'true' : 'false')
        url.searchParams.append('premium_proxy', 'false')
        url.searchParams.append('country_code', 'cl')

        console.log(`🔍 Scraping ${source.nombre_fuente} con ScrapingBee...`)

        const response = await fetch(url.toString())

        if (!response.ok) {
            throw new Error(`ScrapingBee error: ${response.status}`)
        }

        const html = await response.text()
        console.log(`📄 HTML obtenido: ${html.length} caracteres`)

        // Parsear HTML con JSDOM (solo en servidor)
        const { JSDOM } = await import('jsdom')
        const dom = new JSDOM(html)
        const document = dom.window.document

        // Buscar noticias usando múltiples selectores
        const articles: any[] = []

        // Intentar diferentes selectores comunes
        const selectors = [
            'article',
            '.noticia',
            '.news-item',
            '.story',
            '[class*="noticia"]',
            '[class*="news"]',
            '[class*="story"]'
        ]

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector)
            if (elements.length > 0) {
                console.log(`✅ Encontrados ${elements.length} elementos con selector: ${selector}`)

                elements.forEach((element) => {
                    // Buscar título
                    const titleEl = element.querySelector('h1, h2, h3, h4, .title, .titulo, .headline')
                    const title = titleEl?.textContent?.trim()

                    // Buscar link
                    const linkEl = element.querySelector('a')
                    let link = linkEl?.getAttribute('href') || ''

                    // Convertir a URL absoluta si es relativa
                    if (link && !link.startsWith('http')) {
                        try {
                            link = new URL(link, source.url).toString()
                        } catch (e) {
                            link = ''
                        }
                    }

                    // Buscar contenido
                    const contentEl = element.querySelector('.content, .body, .texto, p')
                    const content = contentEl?.textContent?.trim() || ''

                    // Buscar fecha
                    const dateEl = element.querySelector('time, .date, .fecha, .published')
                    const date = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || ''

                    if (title && link) {
                        articles.push({
                            title,
                            link,
                            content,
                            date
                        })
                    }
                })

                // Si encontramos artículos, no seguir buscando
                if (articles.length > 0) break
            }
        }

        // Si no encontramos con selectores específicos, buscar todos los links con títulos
        if (articles.length === 0) {
            console.log('⚠️ No se encontraron artículos con selectores específicos, buscando links...')

            const links = document.querySelectorAll('a[href]')
            links.forEach((linkEl) => {
                const href = linkEl.getAttribute('href') || ''
                const text = linkEl.textContent?.trim() || ''

                // Filtrar solo links que parezcan noticias (tienen texto largo y href válido)
                if (text.length > 30 && href && !href.includes('#') && !href.includes('javascript:')) {
                    let fullUrl = href
                    if (!href.startsWith('http')) {
                        try {
                            fullUrl = new URL(href, source.url).toString()
                        } catch (e) {
                            return
                        }
                    }

                    articles.push({
                        title: text,
                        link: fullUrl,
                        content: '',
                        date: ''
                    })
                }
            })

            console.log(`📰 Encontrados ${articles.length} links que parecen noticias`)
        }

        console.log(`📰 Total de artículos encontrados: ${articles.length}`)

        // ✨ FILTRO DE CALIDAD: Solo procesar artículos con contenido mínimo
        const MIN_CONTENT_LENGTH = 30
        const articlesWithContent = articles.filter(article => {
            const contentLength = (article.content || '').length
            return contentLength >= MIN_CONTENT_LENGTH
        })

        const filteredCount = articles.length - articlesWithContent.length

        if (filteredCount > 0) {
            console.log(`🗑️  Filtrados ${filteredCount} artículos sin contenido suficiente (mínimo ${MIN_CONTENT_LENGTH} caracteres)`)
        }
        console.log(`✅ Artículos con contenido válido: ${articlesWithContent.length}`)

        // Guardar en DB
        let newItems = 0
        let duplicates = 0

        for (const article of articlesWithContent) {
            if (!article.link || !article.title) continue

            const fullUrl = article.link.startsWith('http')
                ? article.link
                : new URL(article.link, source.url).toString()

            // Verificar si ya existe
            const { data: existing } = await supabase
                .from('noticias_scrapeadas')
                .select('id')
                .eq('url', fullUrl)
                .single()

            if (!existing) {
                await supabase.from('noticias_scrapeadas').insert({
                    titulo: article.title,
                    contenido: article.content || '',
                    resumen: article.content?.substring(0, 200) || '',
                    url: fullUrl,
                    fuente: source.nombre_fuente,
                    fuente_id: source.id,  // ✅ AGREGADO: Vincula noticia con fuente
                    categoria: categorizarNoticia(article.title, article.content),
                    region: source.region,
                    fecha_publicacion: article.date ? new Date(article.date).toISOString() : new Date().toISOString(),
                    fecha_scraping: new Date().toISOString(),
                    fue_procesada: false
                })
                newItems++
            } else {
                duplicates++
            }
        }

        const executionTime = Date.now() - startTime
        const costUsd = calculateCostUSD(creditsUsed)

        // Registrar en logs_scraping con metadata del filtrado
        await logScrapingAttempt({
            fuente_id: source.id,
            region: source.region,
            estado: 'exitoso',
            noticias_encontradas: articlesWithContent.length,
            noticias_nuevas: newItems,
            noticias_duplicadas: duplicates,
            tiempo_ejecucion_ms: executionTime,
            metodo_scraping: 'scrapingbee',
            scrapingbee_credits_usados: creditsUsed,
            costo_estimado_usd: costUsd,
            requests_realizados: 1,
            metadata: {
                total_articles_scraped: articles.length,
                articles_filtered: filteredCount,
                articles_with_content: articlesWithContent.length,
                min_content_length: MIN_CONTENT_LENGTH
            }
        })

        return {
            success: true,
            fuente_id: source.id,
            region: source.region,
            noticias_encontradas: articlesWithContent.length,
            noticias_nuevas: newItems,
            noticias_duplicadas: duplicates,
            metodo: 'scrapingbee',
            credits_used: creditsUsed,
            cost_usd: costUsd,
            execution_time_ms: executionTime
        }

    } catch (error) {
        const executionTime = Date.now() - startTime
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'

        // Registrar error
        await logScrapingAttempt({
            fuente_id: source.id,
            region: source.region,
            estado: 'fallido',
            noticias_encontradas: 0,
            noticias_nuevas: 0,
            noticias_duplicadas: 0,
            tiempo_ejecucion_ms: executionTime,
            metodo_scraping: 'scrapingbee',
            scrapingbee_credits_usados: creditsUsed,
            costo_estimado_usd: calculateCostUSD(creditsUsed),
            requests_realizados: 1,
            mensaje_error: errorMessage
        })

        return {
            success: false,
            fuente_id: source.id,
            region: source.region,
            noticias_encontradas: 0,
            noticias_nuevas: 0,
            noticias_duplicadas: 0,
            metodo: 'scrapingbee',
            credits_used: creditsUsed,
            cost_usd: calculateCostUSD(creditsUsed),
            execution_time_ms: executionTime,
            error: errorMessage
        }
    }
}

/**
 * Categoriza automáticamente una noticia
 */
function categorizarNoticia(title: string, content: string): string {
    const keywords = {
        deportes: ['fútbol', 'gol', 'partido', 'campeonato', 'deporte', 'liga', 'copa'],
        economia: ['economía', 'dólar', 'inflación', 'mercado', 'empresa', 'peso', 'banco'],
        politica: ['gobierno', 'presidente', 'congreso', 'ley', 'ministro', 'senado', 'diputado'],
        salud: ['salud', 'hospital', 'médico', 'enfermedad', 'vacuna', 'covid', 'pandemia'],
        tecnologia: ['tecnología', 'internet', 'app', 'software', 'digital', 'celular'],
        cultura: ['cultura', 'arte', 'música', 'cine', 'teatro', 'festival', 'libro']
    }

    const text = `${title} ${content}`.toLowerCase()

    for (const [category, words] of Object.entries(keywords)) {
        if (words.some(word => text.includes(word))) {
            return category
        }
    }

    return 'general'
}

/**
 * Registra un intento de scraping en logs_scraping
 */
async function logScrapingAttempt(log: {
    fuente_id: string
    region: string
    estado: 'exitoso' | 'fallido' | 'parcial'
    noticias_encontradas: number
    noticias_nuevas: number
    noticias_duplicadas: number
    tiempo_ejecucion_ms: number
    metodo_scraping: 'scrapingbee'
    scrapingbee_credits_usados: number
    costo_estimado_usd: number
    requests_realizados: number
    mensaje_error?: string
    metadata?: any
}) {
    try {
        await supabase.from('logs_scraping').insert(log)
    } catch (error) {
        console.error('Error logging scraping attempt:', error)
    }
}

