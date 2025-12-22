import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase-auth'
import { parseRSSFeed } from '@/lib/rss-parser'

const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY
const SCRAPINGBEE_BASE_URL = 'https://app.scrapingbee.com/api/v1/'

interface TestResult {
    method: string
    success: boolean
    count?: number      // Para preview: cantidad de noticias encontradas
    chars?: number      // Para deep: caracteres de contenido
    preview: string
    error?: string
    selector_used?: string  // Qué selector funcionó
}

// POST: Probar scraping de una URL (Preview + Deep)
export async function POST(request: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'super_admin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { url, rss_url, tipo_scraping, selectores_css } = body

    if (!url) {
        return NextResponse.json({ error: 'URL requerida' }, { status: 400 })
    }

    const results: TestResult[] = []
    let htmlCache: string | null = null  // Cache para no scrapear 2 veces
    let firstArticleUrl: string | null = null  // URL del primer artículo para deep test

    console.log('🧪 === INICIANDO TEST DE FUENTE ===')
    console.log(`   URL: ${url}`)
    console.log(`   Selectores título: ${selectores_css?.titulo?.join(', ') || 'ninguno'}`)
    console.log(`   Selectores contenido: ${selectores_css?.contenido?.join(', ') || 'ninguno'}`)

    // =============================================
    // 1. TEST DE PREVIEW (Lista de noticias)
    // =============================================
    if (SCRAPINGBEE_API_KEY) {
        try {
            console.log(`📰 Probando PREVIEW: ${url}`)

            const params = new URLSearchParams({
                api_key: SCRAPINGBEE_API_KEY,
                url,
                render_js: 'true',
                premium_proxy: 'false',
                country_code: 'cl',
                wait: '2000'
            })

            const response = await fetch(`${SCRAPINGBEE_BASE_URL}?${params.toString()}`)

            if (response.ok) {
                const html = await response.text()
                htmlCache = html  // Guardar para debug

                const { JSDOM } = await import('jsdom')
                const dom = new JSDOM(html)
                const doc = dom.window.document
                const baseUrl = new URL(url).origin

                let newsFound = 0
                let usedSelector = ''
                let firstTitle = ''

                // A) Probar selectores personalizados para preview
                if (selectores_css?.titulo && selectores_css.titulo.length > 0) {
                    for (const selector of selectores_css.titulo) {
                        try {
                            const elements = doc.querySelectorAll(selector)
                            if (elements.length > 0) {
                                newsFound = elements.length
                                usedSelector = selector
                                // Obtener primer título y URL
                                const firstEl = elements[0]
                                const anchor = firstEl.tagName === 'A' ? firstEl : firstEl.querySelector('a')
                                firstTitle = anchor?.textContent?.trim().substring(0, 80) || firstEl.textContent?.trim().substring(0, 80) || ''
                                // Capturar URL del primer artículo
                                let href = anchor?.getAttribute('href') || ''
                                if (href && href.startsWith('/')) {
                                    href = baseUrl + href
                                }
                                if (href && href.includes('http')) {
                                    firstArticleUrl = href
                                }
                                console.log(`   ✅ Selector '${selector}': ${newsFound} noticias`)
                                console.log(`   📎 Primera URL: ${firstArticleUrl}`)
                                break
                            }
                        } catch (e) {
                            console.log(`   ❌ Selector inválido: ${selector}`)
                        }
                    }
                }

                // B) Si no hay selectores o no funcionaron, probar genéricos
                if (newsFound === 0) {
                    const genericSelectors = [
                        'h2 a[href*="/"]',
                        'h3 a[href*="/"]',
                        'article h2 a',
                        '.headline a',
                        '.title a',
                        '[class*="title"] a',
                        '[class*="headline"] a'
                    ]
                    for (const selector of genericSelectors) {
                        try {
                            const elements = doc.querySelectorAll(selector)
                            // Filtrar solo los que parecen noticias (texto largo)
                            const validNews = Array.from(elements).filter(el =>
                                el.textContent && el.textContent.trim().length > 20
                            )
                            if (validNews.length >= 3) {
                                newsFound = validNews.length
                                usedSelector = `${selector} (genérico)`
                                firstTitle = validNews[0].textContent?.trim().substring(0, 80) || ''
                                // Capturar URL del primer artículo
                                let href = (validNews[0] as Element).getAttribute('href') || ''
                                if (href && href.startsWith('/')) {
                                    href = baseUrl + href
                                }
                                if (href && href.includes('http')) {
                                    firstArticleUrl = href
                                }
                                break
                            }
                        } catch (e) { }
                    }
                }

                results.push({
                    method: '📰 Preview (Lista)',
                    success: newsFound >= 3,
                    count: newsFound,
                    preview: newsFound > 0
                        ? `Encontradas ${newsFound} noticias. Primera: "${firstTitle}..."`
                        : 'No se encontraron noticias',
                    selector_used: usedSelector || 'ninguno'
                })
            } else {
                results.push({
                    method: '📰 Preview (Lista)',
                    success: false,
                    count: 0,
                    preview: '',
                    error: `HTTP ${response.status}`
                })
            }
        } catch (error) {
            results.push({
                method: '📰 Preview (Lista)',
                success: false,
                count: 0,
                preview: '',
                error: String(error)
            })
        }
    }

    // =============================================
    // 2. TEST DE RSS
    // =============================================
    if (rss_url && (tipo_scraping === 'rss' || tipo_scraping === 'ambos')) {
        try {
            console.log(`📡 Probando RSS: ${rss_url}`)
            const rssFeed = await parseRSSFeed(rss_url, 'Test')

            if (rssFeed.items.length > 0) {
                const firstItem = rssFeed.items[0]
                results.push({
                    method: '📡 RSS Feed',
                    success: rssFeed.items.length >= 3 && firstItem.contenido.length > 50,
                    count: rssFeed.items.length,
                    chars: firstItem.contenido.length,
                    preview: `${rssFeed.items.length} items. Contenido: ${firstItem.contenido.substring(0, 100)}...`
                })
            } else {
                results.push({
                    method: '📡 RSS Feed',
                    success: false,
                    count: 0,
                    preview: '',
                    error: 'No se encontraron items en el feed'
                })
            }
        } catch (error) {
            results.push({
                method: '📡 RSS Feed',
                success: false,
                count: 0,
                preview: '',
                error: String(error)
            })
        }
    }

    // =============================================
    // 3. TEST DE DEEP SCRAPING (Contenido de artículo)
    // =============================================
    if (SCRAPINGBEE_API_KEY && (tipo_scraping === 'web' || tipo_scraping === 'ambos' || !rss_url)) {
        try {
            // Usar la URL del primer artículo detectado, o la URL base si no hay
            const testUrl = firstArticleUrl || url
            console.log(`📄 Probando DEEP scraping en: ${testUrl}`)

            // Siempre descargar HTML fresco para el artículo (no usar cache de homepage)
            let html: string | null = null
            const params = new URLSearchParams({
                api_key: SCRAPINGBEE_API_KEY,
                url: testUrl,
                render_js: 'true',
                premium_proxy: 'false',
                country_code: 'cl',
                wait: '2000'
            })
            const response = await fetch(`${SCRAPINGBEE_BASE_URL}?${params.toString()}`)
            if (response.ok) {
                html = await response.text()
                // Actualizar cache para debug
                htmlCache = html
            }

            if (html) {
                const { JSDOM } = await import('jsdom')
                const dom = new JSDOM(html)
                const doc = dom.window.document

                // Remover elementos basura
                doc.querySelectorAll('script, style, nav, header, footer, .ads, .sidebar, .comments').forEach(el => el.remove())

                let contenido = ''
                let usedSelector = ''
                const debugInfo: string[] = []

                // DEBUG: Mostrar qué contenedores existen en la página
                const possibleContainers = [
                    // Drupal style
                    '.field-name-body', '.node-content', '.field-type-text-with-summary',
                    '.field-field-noticia-cuerpo', '.field-noticia-cuerpo', '.field-body',
                    // WordPress/Generic
                    'article', '.article-body', '.article-content', '.entry-content',
                    '.post-content', '.nota-contenido', '.contenido', '.body-content',
                    'main', '#content', '.content', '.story-body',
                    // News sites
                    '.nota-cuerpo', '.noticia-cuerpo', '.cuerpo-noticia'
                ]

                for (const sel of possibleContainers) {
                    const el = doc.querySelector(sel)
                    if (el && el.textContent) {
                        const len = el.textContent.trim().length
                        if (len > 50) {
                            debugInfo.push(`${sel}: ${len} chars`)
                        }
                    }
                }

                // A) Probar selectores personalizados para contenido
                if (selectores_css?.contenido && selectores_css.contenido.length > 0) {
                    for (const selector of selectores_css.contenido) {
                        try {
                            const el = doc.querySelector(selector)
                            if (el) {
                                contenido = el.textContent?.trim() || ''
                                if (contenido.length > 200) {
                                    usedSelector = selector
                                    console.log(`   ✅ Selector '${selector}': ${contenido.length} chars`)
                                    break
                                }
                            }
                        } catch (e) { }
                    }
                }

                // B) Fallback a selectores genéricos (incluyendo Drupal y sitios de noticias)
                if (contenido.length < 400) {
                    const genericSelectors = [
                        // Drupal style
                        '.field-name-body', '.node-content', '.field-type-text-with-summary',
                        '.field-field-noticia-cuerpo', '.field-noticia-cuerpo',
                        '.field-body', '.node-body',
                        // WordPress style
                        'article', '.article-body', '.entry-content', '.post-content',
                        // Generic
                        'main article', 'main .content', '#content', '.single-content',
                        // News sites
                        '.nota-cuerpo', '.noticia-cuerpo', '.story-content', '.news-body',
                        '.articulo-cuerpo', '.texto-nota', '.cuerpo-noticia'
                    ]
                    for (const sel of genericSelectors) {
                        try {
                            const el = doc.querySelector(sel)
                            if (el && el.textContent && el.textContent.trim().length > 400) {
                                contenido = el.textContent.trim()
                                usedSelector = `${sel} (genérico)`
                                break
                            }
                        } catch (e) { }
                    }
                }

                // Si no encontró contenido, mostrar info de debug
                const previewMessage = contenido.length > 0
                    ? `${contenido.length} chars: "${contenido.substring(0, 150)}..."`
                    : `No se encontró contenido. Contenedores disponibles: ${debugInfo.slice(0, 5).join(', ') || 'ninguno'}`

                results.push({
                    method: '📄 Deep (Contenido)',
                    success: contenido.length > 400,
                    chars: contenido.length,
                    preview: previewMessage,
                    selector_used: usedSelector || 'ninguno'
                })
            } else {
                results.push({
                    method: '📄 Deep (Contenido)',
                    success: false,
                    chars: 0,
                    preview: '',
                    error: 'No se pudo obtener HTML'
                })
            }
        } catch (error) {
            results.push({
                method: '📄 Deep (Contenido)',
                success: false,
                chars: 0,
                preview: '',
                error: String(error)
            })
        }
    }

    // Determinar resultado general
    // NOTA: El test de "Deep" en homepage NO es igual a deep scraping de artículos
    // Preview es lo principal - si detecta noticias, la fuente funciona
    const previewOk = results.some(r => r.method.includes('Preview') && r.success)
    const rssOk = results.some(r => r.method.includes('RSS') && r.success)
    const deepOk = results.some(r => r.method.includes('Deep') && r.success)

    // La fuente funciona si Preview O RSS funcionan
    const sourceWorks = previewOk || rssOk

    console.log(`🧪 === TEST COMPLETADO ===`)
    console.log(`   Preview: ${previewOk ? '✅' : '❌'}`)
    console.log(`   RSS: ${rssOk ? '✅' : '❌'}`)
    console.log(`   Deep (info): ${deepOk ? '✅' : '❌'}`)

    return NextResponse.json({
        success: sourceWorks,
        previewOk,
        rssOk,
        deepOk,
        results,
        recommendation: sourceWorks
            ? (previewOk
                ? `✅ Fuente lista - Detecta ${results.find(r => r.method.includes('Preview'))?.count || 0} noticias`
                : '✅ Fuente lista - RSS funciona correctamente')
            : '⚠️ Configura "Selector para Preview" o verifica la URL',
        // DEBUG INFO
        debug: {
            homepage_url: url,
            article_url: firstArticleUrl || 'no se detectó artículo',
            html_size: htmlCache ? `${htmlCache.length} bytes` : 'no HTML',
            // Mostrar contenedores principales encontrados
            containers_found: htmlCache ? (() => {
                const { JSDOM } = require('jsdom')
                const dom = new JSDOM(htmlCache)
                const doc = dom.window.document
                const containers: string[] = []
                const selectors = [
                    // Drupal style
                    '.field-name-body', '.node-content', '.field-type-text-with-summary',
                    '.field-field-noticia-cuerpo', '.field-noticia-cuerpo', '.field-body',
                    // WordPress/Generic
                    'article', '.article', '.article-body', '.article-content',
                    '.entry-content', '.post-content', '.nota-contenido',
                    '.contenido', '.content', 'main', '#content',
                    // News sites
                    '.nota-cuerpo', '.noticia-cuerpo', '.cuerpo-noticia', '.story-content'
                ]
                selectors.forEach(sel => {
                    const el = doc.querySelector(sel)
                    if (el && el.textContent && el.textContent.trim().length > 100) {
                        containers.push(`${sel}: ${el.textContent.trim().length} chars`)
                    }
                })
                return containers.length > 0 ? containers : ['ninguno encontrado']
            })() : [],
            html_sample: htmlCache
                ? htmlCache
                    .replace(/<script[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[\s\S]*?<\/style>/gi, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .substring(0, 2000) + '...'
                : 'N/A'
        }
    })
}
