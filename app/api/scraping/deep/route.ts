import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase-auth'
import { supabaseAdmin } from '@/lib/supabase-server'

// Constantes de ScrapingBee
const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY
const SCRAPINGBEE_BASE_URL = 'https://app.scrapingbee.com/api/v1/'

// Configuración de fuente desde DB
interface FuenteConfig {
    id: string
    nombre_fuente: string
    url: string
    rss_url: string | null
    tipo_scraping: 'rss' | 'web' | 'ambos'
    selectores_css: {
        contenido?: string[]
        titulo?: string[]
        resumen?: string[]
        imagen?: string[]
        eliminar?: string[]
    }
    usa_premium_proxy: boolean
}

interface NoticiaParaScrape {
    url: string
    titulo: string
    categoria: string
    fuente: string
}

interface NoticiaScrapeada {
    id: string
    titulo: string
    contenido: string
    resumen: string
    url: string
    categoria: string
    fuente: string
    region: string
    imagen_url?: string
}

// Cache de configuraciones de fuentes (para evitar múltiples queries)
const fuentesConfigCache: Map<string, FuenteConfig> = new Map()

/**
 * Obtiene la configuración de una fuente desde la DB
 */
async function getFuenteConfig(url: string): Promise<FuenteConfig | null> {
    // Extraer dominio de la URL
    const domain = new URL(url).hostname.replace('www.', '')

    // Revisar cache primero
    if (fuentesConfigCache.has(domain)) {
        return fuentesConfigCache.get(domain)!
    }

    // Buscar en DB por URL parcial
    const { data, error } = await supabaseAdmin
        .from('fuentes_final')
        .select('id, nombre_fuente, url, rss_url, tipo_scraping, selectores_css, usa_premium_proxy')
        .ilike('url', `%${domain}%`)
        .eq('esta_activo', true)
        .limit(1)
        .single()

    if (error || !data) {
        console.log(`⚠️ No se encontró configuración para ${domain}, usando defaults`)
        return null
    }

    const config: FuenteConfig = {
        id: data.id,
        nombre_fuente: data.nombre_fuente,
        url: data.url,
        rss_url: data.rss_url,
        tipo_scraping: data.tipo_scraping || 'web',
        selectores_css: data.selectores_css || {},
        usa_premium_proxy: data.usa_premium_proxy || false
    }

    // Guardar en cache
    fuentesConfigCache.set(domain, config)
    console.log(`📋 Configuración cargada para ${domain}: tipo=${config.tipo_scraping}, tiene_rss=${!!config.rss_url}`)

    return config
}

// Extrae el contenido usando JSDOM (más robusto que regex)
// dbSelectores: selectores cargados desde la base de datos (prioridad sobre hardcoded)
async function parseWithJSDOM(
    html: string,
    sourceUrl?: string,
    dbSelectores?: { contenido?: string[], eliminar?: string[] }
): Promise<{ contenido: string, resumen: string, imagen: string }> {
    const { JSDOM, VirtualConsole } = await import('jsdom')

    // ✅ Crear consola virtual que silencia errores de CSS
    const virtualConsole = new VirtualConsole()
    virtualConsole.on('error', () => { /* Silenciar errores de CSS parsing */ })

    const dom = new JSDOM(html, { virtualConsole })
    const doc = dom.window.document

    // 1. Eliminar elementos no deseados
    const defaultBadSelectors = [
        'script', 'style', 'nav', 'header', 'footer',
        '.ads', '.publicidad', '#comentarios', '.comments', '.sidebar', '.menu',
        '.relacionadas', '.tags', '.share', '.social', '.author-box',
        '.newsletter', '.subscription', 'aside', '.breadcrumb',
        '.pie-pagina', '.menu-footer', '.gestion-regional', '[class*="footer"]',
        '[class*="menu"]', '[class*="nav-"]', '.publicidad-wrapper'
    ]

    // Combinar selectores de DB con defaults
    const badSelectors = [...defaultBadSelectors, ...(dbSelectores?.eliminar || [])]
    badSelectors.forEach(sel => {
        try {
            doc.querySelectorAll(sel).forEach(el => el.remove())
        } catch (e) {
            // Selector inválido, ignorar
        }
    })

    let contenido = ''

    // PRIORIDAD 1: Selectores de la base de datos
    if (dbSelectores?.contenido && dbSelectores.contenido.length > 0) {
        console.log(`🗄️ Usando selectores de DB: ${dbSelectores.contenido.join(', ')}`)
        for (const selector of dbSelectores.contenido) {
            const el = doc.querySelector(selector)
            if (el) {
                contenido = el.textContent?.trim() || ''
                if (contenido.length > 200) {
                    console.log(`✅ Selector DB exitoso: ${selector} (${contenido.length} chars)`)
                    break
                }
            }
        }
    }

    // PRIORIDAD 2: Selectores hardcoded por sitio (fallback)
    if (contenido.length < 200 && sourceUrl) {
        const siteSpecificSelectors: { [key: string]: string[] } = {
            'emol.com': ['#cuDetalle_cuTexto_uc498', '.EmolText', '#texto_noticia'],
            'soychile.cl': ['.article-body', '.nota-cuerpo', '.article-content'],
            'biobiochile.cl': ['.article-content', '.nota-content', '.entry-content'],
            'cooperativa.cl': ['.article-body', '.nota-cuerpo'],
            'latercera.com': ['.single-content', '.article-body-content'],
            '24horas.cl': ['.article-body', '.nota-content'],
            // ✅ NUEVO: CNN Chile
            'cnnchile.com': ['.c-detail-body', '.article-body', '.c-detail__content', '.c-detail', '.story-body']
        }

        for (const [site, selectors] of Object.entries(siteSpecificSelectors)) {
            if (sourceUrl.includes(site)) {
                console.log(`🎯 Usando selectores hardcoded para ${site}`)
                for (const selector of selectors) {
                    const el = doc.querySelector(selector)
                    if (el) {
                        contenido = el.textContent?.trim() || ''
                        if (contenido.length > 200) break
                    }
                }
                break
            }
        }
    }

    // PRIORIDAD 3: Selectores genéricos (fallback final)
    if (contenido.length < 200) {
        const genericSelectors = [
            'article', '.article-body', '.story-body', '.content-body',
            '.nota-contenido', '.post-content', '.entry-content',
            '#main-content', '.cuerpo-noticia', 'main',
            'div[itemprop="articleBody"]', '.article__body'
        ]

        for (const sel of genericSelectors) {
            const el = doc.querySelector(sel)
            if (el && el.textContent && el.textContent.trim().length > 100) {
                contenido = el.textContent.trim()
                console.log(`✅ Contenido extraído con selector genérico: ${sel} (${contenido.length} chars)`)
                break
            }
        }
    }

    // Fallback: buscar párrafos significativos si no se encontró contenedor principal
    if (contenido.length < 100) {
        console.log(`⚠️ Contenido insuficiente, usando fallback de párrafos...`)
        const paragraphs = Array.from(doc.querySelectorAll('p'))
            .map(p => p.textContent?.trim() || '')
            .filter(text => text.length > 60) // Solo párrafos con sustento

        if (paragraphs.length > 0) {
            contenido = paragraphs.join('\n\n')
            console.log(`📝 Fallback: ${paragraphs.length} párrafos extraídos (${contenido.length} chars)`)
        }
    }

    // 2. Resumen (Bajada)
    let resumen = ''
    const leadSelectors = ['.bajada', '.lead', '.excerpt', '.resumen', '.epigraph', '.article-lead', 'h2.subtitulo', '.intro']

    for (const sel of leadSelectors) {
        const el = doc.querySelector(sel)
        if (el && el.textContent) {
            resumen = el.textContent.trim()
            break
        }
    }

    // 3. Imagen
    let imagen = ''
    const imgSelectors = [
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'article img',
        '.article-image img',
        '.foto-principal img'
    ]

    for (const sel of imgSelectors) {
        const el = doc.querySelector(sel)
        if (el) {
            if (el.tagName === 'META') {
                imagen = el.getAttribute('content') || ''
            } else {
                imagen = el.getAttribute('src') || ''
            }
            if (imagen) break
        }
    }

    return { contenido, resumen, imagen }
}

async function scrapeFullArticle(noticia: NoticiaParaScrape, region: string): Promise<NoticiaScrapeada | null> {
    console.log(`📄 Scrapeando contenido completo: ${noticia.titulo.substring(0, 50)}...`)
    console.log(`   🌍 Región asignada: ${region}`)

    // ✅ OPTIMIZACIÓN: Verificar si ya existe en DB con contenido reciente
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await supabaseAdmin
        .from('noticias_scrapeadas')
        .select('*')
        .eq('url', noticia.url)
        .gt('fecha_scraping', last24h)
        .single()

    if (existing && existing.contenido && existing.contenido.length > 500) {
        console.log(`📦 Usando noticia de DB: ${noticia.titulo.substring(0, 40)}... (${existing.contenido.length} chars)`)
        return {
            id: existing.id,
            titulo: existing.titulo,
            contenido: existing.contenido,
            resumen: existing.resumen || '',
            url: existing.url,
            categoria: existing.categoria || noticia.categoria,
            fuente: existing.fuente || noticia.fuente,
            region: existing.region || region,
            imagen_url: existing.imagen_url
        }
    }

    // Cargar configuración de la fuente desde DB (selectores CSS personalizados)
    const fuenteConfig = await getFuenteConfig(noticia.url)

    if (fuenteConfig) {
        console.log(`📋 Config: ${fuenteConfig.nombre_fuente} | premium=${fuenteConfig.usa_premium_proxy}`)
    }

    // Verificar API Key
    if (!SCRAPINGBEE_API_KEY) {
        console.error('❌ SCRAPINGBEE_API_KEY no configurada')
        return null
    }

    // Función interna para hacer el request a ScrapingBee
    async function fetchWithScrapingBee(usePremium: boolean): Promise<string | null> {
        const shouldUsePremium = usePremium || fuenteConfig?.usa_premium_proxy
        // ✅ OPTIMIZADO: Removido country_code para ahorrar 25 créditos por request
        const params = new URLSearchParams({
            api_key: SCRAPINGBEE_API_KEY,
            url: noticia.url,
            render_js: 'true',
            premium_proxy: shouldUsePremium ? 'true' : 'false',
            wait: shouldUsePremium ? '3000' : '2000'
        })

        const response = await fetch(`${SCRAPINGBEE_BASE_URL}?${params.toString()}`)

        if (!response.ok) {
            console.error(`❌ Error ScrapingBee (premium=${shouldUsePremium}): ${response.status}`)
            return null
        }

        return response.text()
    }

    try {
        // === PASO 1: Intentar con proxy básico ===
        console.log(`   🔹 Intentando con proxy básico...`)
        let html = await fetchWithScrapingBee(false)

        if (!html) {
            console.error(`❌ Error en request básico para ${noticia.url}`)
            return null
        }

        // Pasar selectores de DB a parseWithJSDOM
        let parsed = await parseWithJSDOM(html, noticia.url, fuenteConfig?.selectores_css)
        let contenido = cleanText(parsed.contenido)
        let resumen = cleanText(parsed.resumen)

        // === PASO 2: Si contenido insuficiente, intentar con premium ===
        if (contenido.length < 200) {
            console.log(`   ⚠️ Contenido insuficiente (${contenido.length} chars), reintentando con PREMIUM...`)

            const htmlPremium = await fetchWithScrapingBee(true)

            if (htmlPremium) {
                const parsedPremium = await parseWithJSDOM(htmlPremium, noticia.url, fuenteConfig?.selectores_css)
                const contenidoPremium = cleanText(parsedPremium.contenido)

                // Solo usar premium si obtuvo más contenido
                if (contenidoPremium.length > contenido.length) {
                    console.log(`   ✅ PREMIUM exitoso: ${contenidoPremium.length} chars (vs ${contenido.length} básico)`)
                    contenido = contenidoPremium
                    resumen = cleanText(parsedPremium.resumen)
                    parsed = parsedPremium
                } else {
                    console.log(`   ⚠️ PREMIUM no mejoró el resultado (${contenidoPremium.length} chars)`)
                }
            }
        }

        // === LOGS DE DEBUG ===
        console.log(`\n📰 === NOTICIA SCRAPEADA ===`)
        console.log(`   📌 Título: ${noticia.titulo.substring(0, 60)}...`)
        console.log(`   🔗 URL: ${noticia.url}`)
        console.log(`   📊 Contenido FINAL: ${contenido.length} chars`)
        console.log(`   📄 Preview: "${contenido.substring(0, 150)}..."`)
        // ======================

        // Validaciones de contenido mínimo (fallback final)
        if (contenido.length < 100) {
            console.warn(`⚠️ Contenido insuficiente después de premium`)
            if (resumen.length > contenido.length) {
                contenido = resumen
                console.log(`   🔄 Usando resumen como contenido`)
            } else if (contenido.length < 50) {
                contenido = `(Contenido breve). ${noticia.titulo}`
                console.log(`   ❌ FALLBACK: Usando solo título`)
            }
        }

        if (!resumen && contenido.length > 200) {
            resumen = contenido.substring(0, 200) + '...'
        }

        console.log(`   ✅ FINAL: ${contenido.length} chars de contenido`)
        console.log(`   ========================\n`)

        return {
            id: `deep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            titulo: noticia.titulo,
            contenido,
            resumen,
            url: noticia.url,
            categoria: noticia.categoria,
            fuente: noticia.fuente,
            region,
            imagen_url: parsed.imagen || undefined
        }

    } catch (error) {
        console.error(`❌ Error scrapeando ${noticia.url}:`, error)
        return null
    }
}

// Limpia texto scrapeado - INCLUYE FILTROS BIOBIOCHILE
function cleanText(text: string): string {
    if (!text) return ''

    return text
        // Eliminar scripts y estilos residuales
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        // Eliminar tags HTML
        .replace(/<[^>]+>/g, ' ')
        // Eliminar caracteres especiales
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')

        // ==========================================
        // FILTROS ESPECÍFICOS PARA BIOBIOCHILE
        // ==========================================
        // Formulario de corrección/contacto - MEJORADO para todas las variantes
        .replace(/Nombre y Apellido.*?Comentario/gis, '')
        .replace(/Certifico que es información real.*?(BioBío|Bio Bio|BioBioChile)/gis, '')
        .replace(/Certifico que es información real y autorizo a Bio Bio para publicarla.*?conveniente/gis, '')
        .replace(/Correo electrónico.*?Teléfono/gis, '')
        .replace(/Ciudad o localización/gi, '')
        .replace(/Contacto Corrección o Comentario/gi, '')
        .replace(/Por favor complete todos los campos/gi, '')
        .replace(/haga check para certificar/gi, '')
        .replace(/veracidad de los datos/gi, '')
        .replace(/antes de enviar la corrección/gi, '')
        .replace(/Por favor ingrese.*?e-mail valido/gi, '')
        .replace(/Su mensaje fue enviado.*?exitosamente/gi, '')
        .replace(/Atenderemos su corrección/gi, '')
        .replace(/Atenderemos su correción/gi, '') // Con typo
        .replace(/cuanto antes/gi, '')
        .replace(/Enviando corrección.*?momento/gi, '')
        .replace(/ENVIAR/g, '')
        .replace(/manteniendo la confidencialidad de mis datos/gi, '')
        .replace(/si asi lo deseo/gi, '')
        .replace(/y la antes de enviar la correccion\.?!?/gi, '')
        // ✅ NUEVO: Fragmentos adicionales que quedaban
        .replace(/para publicarla de la forma\.?/gi, '')
        .replace(/de la forma\. y la/gi, '')
        .replace(/\.\.!/g, '.') // Limpiar puntuación rota
        // ✅ NUEVO: Limpiar caracteres especiales × que aparecen
        .replace(/[×]/g, '')
        .replace(/Que estime conveniente,?\.?\s*/gi, '')
        // ✅ NUEVO: Limpiar categorías con > al inicio
        .replace(/^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+\s*>\s*/gm, '')
        .replace(/Fútbol\s*>/gi, '')
        .replace(/Inter\s*>/gi, '')
        .replace(/Región de [A-Za-zÁÉÍÓÚáéíóúñÑ\s]+\s*>/gi, '')
        .replace(/Noticia\s+(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)/gi, '')
        .replace(/Agencia de noticias\s+(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)/gi, '')
        .replace(/senadores electos diputados electos toda la cobertura/gi, '')
        // Metadatos de autor y visitas
        .replace(/por [A-Z][a-z]+ [A-Z][a-z]+ Periodista de Prensa en BioBioChile/gi, '')
        .replace(/Periodista de Prensa en BioBioChile/gi, '')
        .replace(/Por [A-Z][a-z]+ [A-Z][a-z]+\s+[A-Z][a-záéíóú]+\s+\d+\s+\w+,\s+\d{4}/gi, '')
        .replace(/\d+[\.,]\d+ visitas/gi, '')
        .replace(/VER RESUMEN/gi, '')
        .replace(/Resumen generado con.*?Inteligencia Artificial.*?BioBioChile/gis, '')
        .replace(/revisado por el autor de este artículo/gi, '')
        .replace(/Archivo Agencia UNO/gi, '')
        .replace(/Seguimos criterios de Ética y transparencia de BioBioChile/gi, '')
        // Categorías de menú
        .replace(/Artes y Cultura\s*>/gi, '')
        .replace(/Nacional\s*>/gi, '')
        .replace(/Internacional\s*>/gi, '')
        .replace(/(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)\s+\d+\s+(de\s+)?\w+,?\s+\d{4}/gi, '')
        .replace(/Publicado a las \d{1,2}:\d{2}/gi, '')
        // Fechas y timestamps
        .replace(/\d{1,2}:\d{2}/g, '')

        // ==========================================
        // LIMPIEZA GENERAL
        // ==========================================
        // Limpiar espacios
        .replace(/\s+/g, ' ')
        // Eliminar líneas vacías múltiples
        .replace(/\n\s*\n/g, '\n')
        // Eliminar puntos múltiples
        .replace(/\.{2,}/g, '.')
        // Limpiar espacios antes de puntuación
        .replace(/\s+([.,;:!?])/g, '$1')
        .trim()
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { noticias, region = 'Nacional', userId: bodyUserId } = body

        // ✅ FIX: Auth via body userId first (for long operations), then session
        // Esto evita race conditions con refresh tokens durante operaciones largas
        let userId: string | null = null
        let userEmail: string = 'unknown'
        let authMethod = 'session'

        if (bodyUserId) {
            // Validar que el userId existe en la DB
            const { data: userCheck } = await supabaseAdmin
                .from('users')
                .select('id, email')
                .eq('id', bodyUserId)
                .single()

            if (userCheck) {
                userId = bodyUserId
                userEmail = userCheck.email
                authMethod = 'body'
            }
        }

        // Fallback a getCurrentUser si no vino userId en body
        if (!userId) {
            const user = await getCurrentUser()
            if (!user) {
                return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
            }
            userId = user.id
            userEmail = user.email
        }

        console.log(`🔐 Auth via ${authMethod}: ${userEmail}`)

        if (!noticias || !Array.isArray(noticias) || noticias.length === 0) {
            return NextResponse.json({
                error: 'Debes enviar un array de noticias para scrapear',
                success: false
            }, { status: 400 })
        }

        // Límite de 50 noticias por request (10 por categoría * 5 categorías aprox)
        if (noticias.length > 50) {
            return NextResponse.json({
                error: 'Máximo 50 noticias por solicitud',
                success: false
            }, { status: 400 })
        }

        console.log(`🔍 Iniciando scraping profundo de ${noticias.length} noticias para ${userEmail}`)

        // Scrapear noticias en lotes de 3
        const batchSize = 3
        const resultados: NoticiaScrapeada[] = []
        const errores: string[] = []

        for (let i = 0; i < noticias.length; i += batchSize) {
            const batch = noticias.slice(i, i + batchSize)
            const batchResults = await Promise.all(
                batch.map((n: NoticiaParaScrape) => scrapeFullArticle(n, region))
            )

            batchResults.forEach((result, idx) => {
                if (result) {
                    resultados.push(result)
                } else {
                    errores.push(batch[idx].url)
                }
            })

            // Pequeña pausa entre lotes para no saturar ScrapingBee
            if (i + batchSize < noticias.length) {
                await new Promise(resolve => setTimeout(resolve, 500))
            }
        }

        console.log(`✅ Scraping completado: ${resultados.length}/${noticias.length} exitosos`)

        // Guardar noticias en la base de datos
        if (resultados.length > 0) {
            // DEDUPLICACIÓN: Eliminar duplicados por URL antes de insertar
            const uniqueResults = Array.from(
                new Map(resultados.map(item => [item.url, item])).values()
            )

            // === LOG RESUMEN DE LO QUE SE GUARDARÁ ===
            console.log(`\n💾 === RESUMEN DE GUARDADO EN DB ===`)
            uniqueResults.forEach((n, i) => {
                console.log(`   ${i + 1}. ${n.titulo.substring(0, 50)}...`)
                console.log(`      📊 Contenido: ${n.contenido.length} chars | Región: ${n.region} | Cat: ${n.categoria}`)
            })
            console.log(`   ================================\n`)
            // =========================================

            const noticiasParaDB = uniqueResults.map(n => ({
                titulo: n.titulo,
                contenido: n.contenido || '', // Asegurar string
                resumen: n.resumen || '',
                url: n.url,
                fuente: n.fuente,
                categoria: n.categoria,
                region: n.region,
                imagen_url: n.imagen_url,
                fecha_scraping: new Date().toISOString(),
                fue_procesada: false
            }))

            const { error: insertError } = await supabaseAdmin
                .from('noticias_scrapeadas')
                .upsert(noticiasParaDB, {
                    onConflict: 'url',
                    ignoreDuplicates: false
                })

            if (insertError) {
                console.error('Error guardando noticias:', insertError)
                // No fallar, solo loguear
            } else {
                console.log(`💾 ${resultados.length} noticias guardadas en DB`)
            }
        }

        return NextResponse.json({
            success: true,
            noticias_procesadas: resultados.length,
            noticias_fallidas: errores.length,
            noticias: resultados,
            errores: errores.length > 0 ? errores : undefined
        })

    } catch (error: any) {
        console.error('Error en deep scraping:', error)
        return NextResponse.json(
            { error: error.message || 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
