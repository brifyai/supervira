import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase-auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getResourceOwnerId } from '@/lib/resource-owner'

// Constantes de ScrapingBee
const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY
const SCRAPINGBEE_BASE_URL = 'https://app.scrapingbee.com/api/v1/'

interface NewsPreview {
    id: string
    titulo: string
    bajada: string
    url: string
    categoria: string
    fuente: string
    fuente_id: string
    imagen_url?: string
    fecha_publicacion?: string  // ✅ Fecha extraída de la URL
}

// Función para categorizar noticias automáticamente
function categorizarNoticia(titulo: string, bajada: string = ''): string {
    const texto = `${titulo} ${bajada}`.toLowerCase()

    // Orden de prioridad: específico a genérico
    const categorias: { [key: string]: string[] } = {
        // Regionales primero (más específico) - incluye regiones y ciudades de Chile
        'Regionales': [
            'región', 'regional', 'provincial', 'comunal', 'municipio', 'alcalde', 'gobernador', 'local',
            'ñuble', 'chillán', 'concepción', 'biobío', 'bio-bio', 'talca', 'maule', 'valparaíso',
            'viña del mar', 'antofagasta', 'temuco', 'araucanía', 'puerto montt', 'los lagos',
            'coquimbo', 'la serena', 'rancagua', 'o\'higgins', 'arica', 'iquique', 'punta arenas',
            'magallanes', 'aysén', 'los ríos', 'valdivia', 'osorno', 'atacama', 'copiapó'
        ],
        'Deportes': [
            'fútbol', 'futbol', 'gol', 'partido', 'estadio', 'selección', 'colo colo', 'colo-colo',
            'universidad de chile', 'universidad católica', 'liga', 'copa', 'deportes', 'jugador',
            'técnico', 'entrenador', 'campeonato', 'atleta', 'olímpico', 'mundial', 'champions',
            'libertadores', 'sudamericana', 'tenis', 'nadal', 'arturo vidal', 'alexis sánchez'
        ],
        'Política': [
            'gobierno', 'presidente', 'ministro', 'congreso', 'senado', 'diputado', 'elecciones',
            'votación', 'político', 'ley', 'decreto', 'boric', 'piñera', 'bachelet', 'carabineros',
            'pdi', 'fiscalía', 'fiscal', 'tribunal', 'suprema', 'constitucional', 'parlamentario',
            'izquierda', 'derecha', 'oposición', 'oficialismo', 'reforma', 'proyecto de ley'
        ],
        'Economía': [
            'dólar', 'economía', 'banco', 'imacec', 'inflación', 'mercado', 'bolsa', 'inversión',
            'finanzas', 'empresas', 'comercio', 'pib', 'cobre', 'minería', 'exportaciones',
            'importaciones', 'afp', 'pensiones', 'sueldo', 'empleo', 'desempleo', 'precio',
            'uf', 'ipsa', 'sii', 'impuestos', 'bce', 'banco central', 'recesión', 'crecimiento'
        ],
        'Mundo': [
            'internacional', 'eeuu', 'estados unidos', 'china', 'rusia', 'ucrania', 'europa',
            'brasil', 'argentina', 'perú', 'bolivia', 'extranjero', 'trump', 'biden', 'putin',
            'onu', 'otan', 'unión europea', 'medio oriente', 'israel', 'palestina', 'gaza',
            'venezuela', 'maduro', 'guerra', 'conflicto internacional'
        ],
        'Tecnología': [
            'tecnología', 'apple', 'google', 'microsoft', 'inteligencia artificial', 'ia', 'openai',
            'chatgpt', 'smartphone', 'app', 'digital', 'internet', 'ciberseguridad', 'bitcoin',
            'criptomonedas', 'elon musk', 'tesla', 'meta', 'facebook', 'starlink', 'innovación',
            'startup', 'software', 'datos', 'privacidad digital'
        ],
        'Tendencias': [
            'viral', 'redes sociales', 'instagram', 'tiktok', 'twitter', 'x.com', 'farándula',
            'espectáculo', 'celebridad', 'influencer', 'youtuber', 'streaming', 'netflix',
            'trending', 'meme', 'cultura pop'
        ],
        // Nacionales al final (más genérico, actúa como fallback)
        'Nacionales': [
            'chile', 'chileno', 'chilena', 'santiago', 'nacional', 'país', 'la moneda',
            'metro de santiago', 'transantiago', 'red metropolitana'
        ]
    }

    for (const [categoria, keywords] of Object.entries(categorias)) {
        if (keywords.some(keyword => texto.includes(keyword))) {
            return categoria
        }
    }

    return 'Nacionales' // Default
}

// Tipo para fuente con selectores
interface SourceInfo {
    id: string
    url: string
    nombre_fuente: string
    region: string
    selectores_css?: {
        titulo?: string[]
        contenido?: string[]
        eliminar?: string[]
    }
}

// Scrapea la página principal de una fuente con ScrapingBee
// ✅ OPTIMIZADO: Verifica cache antes de scrapear para ahorrar créditos
// ✅ MEJORADO: Usa selectores CSS si están configurados
async function scanSourceHomepage(source: SourceInfo): Promise<{ noticias: NewsPreview[], fromCache: boolean }> {
    if (!SCRAPINGBEE_API_KEY) {
        console.error('❌ SCRAPINGBEE_API_KEY no configurada')
        return { noticias: [], fromCache: false }
    }

    try {
        // ✅ PASO 1: Verificar si hay cache válido
        const { data: cached } = await supabaseAdmin
            .from('scraping_cache')
            .select('*')
            .eq('fuente_url', source.url)
            .gt('expires_at', new Date().toISOString())
            .single()

        if (cached && cached.noticias && Array.isArray(cached.noticias)) {
            console.log(`📦 Usando CACHE para ${source.nombre_fuente} (${cached.noticias.length} noticias, expira: ${new Date(cached.expires_at).toLocaleTimeString()})`)

            // Convertir noticias del cache al formato esperado
            const noticiasFromCache: NewsPreview[] = cached.noticias.map((n: any) => ({
                id: n.id || `cache-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                titulo: n.titulo,
                bajada: n.bajada || '',
                url: n.url,
                categoria: n.categoria,
                fuente: source.nombre_fuente,
                fuente_id: source.id,
                imagen_url: n.imagen_url,
                fecha_publicacion: n.fecha_publicacion
            }))

            return { noticias: noticiasFromCache, fromCache: true }
        }

        // ✅ PASO 2: No hay cache, scrapear normalmente
        console.log(`🔍 Escaneando: ${source.nombre_fuente} - ${source.url} (sin cache)`)

        const params = new URLSearchParams({
            api_key: SCRAPINGBEE_API_KEY,
            url: source.url,
            render_js: 'true'
        })

        const response = await fetch(`${SCRAPINGBEE_BASE_URL}?${params.toString()}`)

        if (!response.ok) {
            console.error(`❌ Error ScrapingBee: ${response.status}`)
            return { noticias: [], fromCache: false }
        }

        const html = await response.text()

        // ✅ NUEVO: Usar selectores CSS si están configurados, si no usar regex
        let noticias: NewsPreview[]
        const hasCustomSelectors = source.selectores_css?.titulo && source.selectores_css.titulo.length > 0

        if (hasCustomSelectors) {
            console.log(`🎯 Usando selectores CSS personalizados: ${source.selectores_css!.titulo!.join(', ')}`)
            noticias = await parseNewsWithSelectors(html, source, source.selectores_css!.titulo!)
        } else {
            // Parsear HTML con regex genéricos (comportamiento original)
            noticias = parseNewsFromHTML(html, source)
        }

        console.log(`✅ Encontradas ${noticias.length} noticias en ${source.nombre_fuente} (modo: ${hasCustomSelectors ? 'CSS' : 'regex'})`)

        // ✅ PASO 3: Guardar en cache para futuros requests
        if (noticias.length > 0) {
            const categoriasConteo: { [key: string]: number } = {}
            noticias.forEach(n => {
                categoriasConteo[n.categoria] = (categoriasConteo[n.categoria] || 0) + 1
            })

            const { error: cacheError } = await supabaseAdmin
                .from('scraping_cache')
                .upsert({
                    fuente_id: source.id,
                    fuente_url: source.url,
                    noticias: noticias.map(n => ({
                        id: n.id,
                        titulo: n.titulo,
                        bajada: n.bajada,
                        url: n.url,
                        categoria: n.categoria,
                        imagen_url: n.imagen_url,
                        fecha_publicacion: n.fecha_publicacion
                    })),
                    categorias_conteo: categoriasConteo,
                    total_noticias: noticias.length,
                    created_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 horas
                }, {
                    onConflict: 'fuente_url'
                })

            if (cacheError) {
                console.warn(`⚠️ Error guardando cache: ${cacheError.message}`)
            } else {
                console.log(`💾 Cache guardado para ${source.nombre_fuente} (expira en 24h)`)
            }
        }

        return { noticias, fromCache: false }

    } catch (error) {
        console.error(`❌ Error escaneando ${source.nombre_fuente}:`, error)
        return { noticias: [], fromCache: false }
    }
}

// ✅ Función para extraer fecha de la URL (patrón común en sitios de noticias)
function extractDateFromUrl(url: string): Date | null {
    // Patrones comunes de fechas en URLs
    const patterns = [
        // /2024/12/12/ o /2024-12-12/
        /\/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\//,
        // /12-12-2024/ o /12/12/2024/
        /\/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})\//,
        // ?date=2024-12-12
        /date=(\d{4})-(\d{1,2})-(\d{1,2})/,
        // /noticias/2024/diciembre/12/
        /\/(\d{4})\/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\/(\d{1,2})\//i,
    ]

    for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) {
            let year, month, day

            if (match[2] && isNaN(parseInt(match[2]))) {
                // Es un nombre de mes
                const monthNames: { [key: string]: number } = {
                    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
                    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
                    'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
                }
                year = parseInt(match[1])
                month = monthNames[match[2].toLowerCase()]
                day = parseInt(match[3])
            } else if (parseInt(match[1]) > 31) {
                // Formato YYYY/MM/DD
                year = parseInt(match[1])
                month = parseInt(match[2]) - 1
                day = parseInt(match[3])
            } else {
                // Formato DD/MM/YYYY
                day = parseInt(match[1])
                month = parseInt(match[2]) - 1
                year = parseInt(match[3])
            }

            if (year && month !== undefined && day) {
                return new Date(year, month, day)
            }
        }
    }

    return null
}

// ✅ Función para verificar si una fecha es reciente (máximo N días de antigüedad)
function isNewsRecent(dateFromUrl: Date | null, maxDaysOld: number = 2): boolean {
    if (!dateFromUrl) return true // Si no hay fecha, asumimos que es reciente

    const now = new Date()
    const diffTime = now.getTime() - dateFromUrl.getTime()
    const diffDays = diffTime / (1000 * 60 * 60 * 24)

    return diffDays <= maxDaysOld
}

// ✅ NUEVO: Parser con selectores CSS usando JSDOM
async function parseNewsWithSelectors(
    html: string,
    source: SourceInfo,
    selectors: string[]
): Promise<NewsPreview[]> {
    const { JSDOM } = await import('jsdom')
    const dom = new JSDOM(html)
    const doc = dom.window.document

    const noticias: NewsPreview[] = []
    const seenUrls = new Set<string>()
    const baseUrl = new URL(source.url).origin
    const MAX_DAYS_OLD = 2

    for (const selector of selectors) {
        try {
            const elements = doc.querySelectorAll(selector)
            console.log(`   Selector '${selector}': ${elements.length} elementos encontrados`)

            elements.forEach((el: Element) => {
                // El elemento puede ser un <a> o contener un <a>
                const anchor = el.tagName === 'A' ? el : el.querySelector('a')
                if (!anchor) return

                let href = anchor.getAttribute('href') || ''
                let titulo = anchor.textContent?.trim() || ''

                // Normalizar URL
                if (href.startsWith('/')) {
                    href = baseUrl + href
                }

                // Validaciones
                if (seenUrls.has(href)) return
                if (!href.includes('http')) return
                if (href.includes('#') || href.includes('javascript:')) return
                if (titulo.length < 20 || titulo.length > 300) return

                // Filtrar noticias viejas
                const dateFromUrl = extractDateFromUrl(href)
                if (!isNewsRecent(dateFromUrl, MAX_DAYS_OLD)) return

                seenUrls.add(href)

                noticias.push({
                    id: `preview-${Date.now()}-${noticias.length}`,
                    titulo: titulo.replace(/\s+/g, ' '),
                    bajada: '',
                    url: href,
                    categoria: categorizarNoticia(titulo),
                    fuente: source.nombre_fuente,
                    fuente_id: source.id,
                    fecha_publicacion: dateFromUrl?.toISOString()
                })
            })

            if (noticias.length >= 50) break
        } catch (e) {
            console.warn(`   Error con selector '${selector}':`, e)
        }
    }

    return noticias
}

// Parser genérico de noticias desde HTML (fallback con regex)
function parseNewsFromHTML(html: string, source: { id: string, url: string, nombre_fuente: string }): NewsPreview[] {
    const noticias: NewsPreview[] = []

    // Usar regex para extraer noticias (compatible con servidor sin DOM)
    // Patrón para encontrar artículos/links de noticias

    // Buscar patrones comunes de titulares
    const patterns = [
        // Patrón 1: <h2><a href="URL">TITULO</a></h2>
        /<h[1-3][^>]*>\s*<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi,
        // Patrón 2: <a href="URL" class="...title...">TITULO</a>
        /<a[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*(?:title|headline|titular)[^"']*["'][^>]*>([^<]+)<\/a>/gi,
        // Patrón 3: <article><a href="URL">...<h2>TITULO</h2></a></article>
        /<article[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi,
    ]

    const seenUrls = new Set<string>()
    const baseUrl = new URL(source.url).origin
    const MAX_DAYS_OLD = 2 // Solo noticias de los últimos 2 días

    for (const pattern of patterns) {
        let match
        while ((match = pattern.exec(html)) !== null) {
            let [, url, titulo] = match

            // Normalizar URL
            if (url.startsWith('/')) {
                url = baseUrl + url
            }

            // Filtrar URLs duplicadas y no-noticias
            if (seenUrls.has(url)) continue
            if (!url.includes('http')) continue
            if (url.includes('#') || url.includes('javascript:')) continue
            if (titulo.length < 20 || titulo.length > 300) continue

            // ✅ NUEVO: Extraer fecha de la URL y filtrar viejas
            const dateFromUrl = extractDateFromUrl(url)
            if (!isNewsRecent(dateFromUrl, MAX_DAYS_OLD)) {
                console.log(`⏰ Noticia vieja filtrada (${dateFromUrl?.toLocaleDateString()}): ${titulo.substring(0, 50)}...`)
                continue
            }

            // Limpiar título
            titulo = titulo.trim().replace(/\s+/g, ' ')

            seenUrls.add(url)

            const categoria = categorizarNoticia(titulo)

            noticias.push({
                id: `preview-${Date.now()}-${noticias.length}`,
                titulo,
                bajada: '', // Se obtiene en scraping profundo
                url,
                categoria,
                fuente: source.nombre_fuente,
                fuente_id: source.id,
                // ✅ NUEVO: Agregar fecha extraída de URL (si existe)
                fecha_publicacion: dateFromUrl?.toISOString()
            })

            if (noticias.length >= 50) break // Límite por fuente
        }
        if (noticias.length >= 50) break
    }

    return noticias
}

// Helper para obtener fuentes del usuario (con filtro opcional por región)
async function getUserSources(
    resourceOwnerId: string,
    filterRegion?: string
): Promise<SourceInfo[]> {
    try {
        const { data: suscripciones, error: subError } = await supabaseAdmin
            .from('user_fuentes_suscripciones')
            .select(`
                id,
                categoria,
                fuente:fuentes_final (
                    id,
                    url,
                    nombre_fuente,
                    region,
                    esta_activo,
                    selectores_css
                )
            `)
            .eq('user_id', resourceOwnerId)
            .eq('esta_activo', true)

        if (!subError && suscripciones && suscripciones.length > 0) {
            let fuentes: SourceInfo[] = suscripciones
                .filter((s: any) => s.fuente?.esta_activo)
                .map((s: any) => ({
                    id: s.fuente.id,
                    url: s.fuente.url,
                    nombre_fuente: s.fuente.nombre_fuente,
                    region: s.fuente.region,
                    selectores_css: s.fuente.selectores_css || {}
                }))

            // ✅ Filtrar por región si se especifica
            // Incluir fuentes de la región específica + fuentes "Nacional" (siempre útiles)
            if (filterRegion && filterRegion !== 'Nacional') {
                const regionLower = filterRegion.toLowerCase()
                fuentes = fuentes.filter(f =>
                    f.region.toLowerCase() === regionLower ||
                    f.region.toLowerCase() === 'nacional'
                )
                console.log(`🌍 Filtradas ${fuentes.length} fuentes para región: ${filterRegion}`)
            }

            return fuentes
        }

        // Sin suscripciones = sin fuentes (el usuario debe agregar desde /activos)
        console.log(`⚠️ Usuario ${resourceOwnerId} no tiene fuentes suscritas`)
        return []

    } catch (error) {
        console.error('Error obteniendo fuentes del usuario:', error)
        return []
    }
}

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const resourceOwnerId = getResourceOwnerId(user)
        const fuentes = await getUserSources(resourceOwnerId)

        return NextResponse.json({
            success: true,
            fuentes
        })
    } catch (error) {
        console.error('Error en GET sources:', error)
        return NextResponse.json({ error: 'Error obteniendo fuentes' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        // Autenticar usuario usando getCurrentUser (funciona con cookies)
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const resourceOwnerId = getResourceOwnerId(user)

        // Obtener body para ver si hay filtro de fuentes y región
        let sourceIds: string[] | undefined
        let filterRegion: string | undefined
        try {
            const body = await request.json()
            if (body.sourceIds && Array.isArray(body.sourceIds)) {
                sourceIds = body.sourceIds
            }
            // ✅ NUEVO: Aceptar región para filtrar fuentes
            if (body.region && typeof body.region === 'string') {
                filterRegion = body.region
                console.log(`🌍 Región para filtrar: ${filterRegion}`)
            }
        } catch (e) {
            // Body vacío es válido (escanear todas)
        }

        // Obtener fuentes disponibles (filtradas por región si se especifica)
        let fuentes = await getUserSources(resourceOwnerId, filterRegion)

        if (fuentes.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No hay fuentes de noticias configuradas en el sistema.',
                noticias: [],
                por_categoria: {}
            })
        }

        // Filtrar si se especificaron IDs
        if (sourceIds && sourceIds.length > 0) {
            console.log(`🎯 Filtrando por ${sourceIds.length} fuentes seleccionadas`)
            fuentes = fuentes.filter(f => sourceIds!.includes(f.id))
        }

        if (fuentes.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No hay fuentes seleccionadas para escanear',
                noticias: [],
                por_categoria: {}
            })
        }

        console.log(`📡 Escaneando ${fuentes.length} fuentes para usuario ${user.email}`)
        console.log(`📋 Fuentes a escanear:`, fuentes.map(f => `${f.nombre_fuente} (${f.region})`).join(', '))

        // Escanear cada fuente en paralelo (máx 3 a la vez)
        const allNoticias: NewsPreview[] = []
        const batchSize = 3
        let cachedSources = 0
        let freshSources = 0

        for (let i = 0; i < fuentes.length; i += batchSize) {
            const batch = fuentes.slice(i, i + batchSize)
            const results = await Promise.all(batch.map(scanSourceHomepage))
            results.forEach(result => {
                allNoticias.push(...result.noticias)
                if (result.fromCache) {
                    cachedSources++
                } else {
                    freshSources++
                }
            })
        }

        // Contar por categoría
        const porCategoria: { [key: string]: number } = {}
        allNoticias.forEach(n => {
            porCategoria[n.categoria] = (porCategoria[n.categoria] || 0) + 1
        })

        console.log(`✅ Total: ${allNoticias.length} noticias encontradas`)
        console.log(`📊 Por categoría:`, porCategoria)
        console.log(`💾 Fuentes de cache: ${cachedSources} | Scrapeadas: ${freshSources}`)

        return NextResponse.json({
            success: true,
            noticias: allNoticias,
            por_categoria: porCategoria,
            fuentes_escaneadas: fuentes.length,
            total_noticias: allNoticias.length,
            cached_sources: cachedSources,
            fresh_sources: freshSources
        })

    } catch (error: any) {
        console.error('Error en preview scraping:', error)
        return NextResponse.json(
            { error: error.message || 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
