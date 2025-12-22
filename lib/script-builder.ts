// ==================================================
// VIRA - Script Builder para Noticieros Naturales
// ==================================================
// Construye un script de noticiero con:
// - Agrupación temática de noticias
// - Transiciones contextuales
// - Comentarios de locutor
// - Preguntas retóricas
// - Control de tiempo
// ==================================================

// Tipos de entrada
export interface NewsForScript {
    id: string
    titulo: string
    categoria: string
    contenido: string
    palabras_objetivo: number
    segundos_asignados: number
    es_destacada?: boolean
}

// Tipos de salida
export type SegmentType = 'intro' | 'transition' | 'news' | 'comment' | 'question' | 'pause' | 'outro'

export interface ScriptSegment {
    type: SegmentType
    content: string           // Texto del segmento
    newsId?: string           // ID de noticia (si aplica)
    estimatedSeconds: number  // Duración estimada
    context?: string          // Contexto adicional (relacionada, principal, etc)
}

export interface NewsCluster {
    theme: string           // Tema del cluster (política, economía, etc)
    mainEntity?: string     // Entidad principal (Kast, Boric, etc)
    news: NewsForScript[]   // Noticias del cluster
}

export interface BuildScriptInput {
    noticias: NewsForScript[]
    duracionObjetivoSegundos: number
    wpm: number
    incluirComentarios: boolean
    incluirPreguntasRetoricas: boolean
    region: string
}

export interface BuiltScript {
    segments: ScriptSegment[]
    duracionTotalEstimada: number
    clusters: NewsCluster[]
}

// ==================================================
// DETECCIÓN DE ENTIDADES
// ==================================================
const KNOWN_ENTITIES = [
    // Políticos
    'Kast', 'Boric', 'Piñera', 'Bachelet', 'Jara', 'Lagos', 'Frei',
    // Partidos
    'Republicano', 'Frente Amplio', 'UDI', 'RN', 'PS', 'PC', 'PPD', 'PDC',
    // Instituciones
    'Congreso', 'La Moneda', 'Servel', 'Contraloría', 'Banco Central',
    // Deportes
    'Colo Colo', 'Universidad de Chile', 'U Católica', 'Selección', 'Copa',
    // Economía
    'IPSA', 'Bolsa', 'Dólar', 'Peso', 'Inflación', 'PIB'
]

export function detectEntities(titulo: string): string[] {
    const entities: string[] = []
    const tituloLower = titulo.toLowerCase()

    for (const entity of KNOWN_ENTITIES) {
        if (tituloLower.includes(entity.toLowerCase())) {
            entities.push(entity)
        }
    }

    return entities
}

// ==================================================
// AGRUPACIÓN TEMÁTICA
// ==================================================
export function clusterByTheme(noticias: NewsForScript[]): NewsCluster[] {
    const clusters: Map<string, NewsCluster> = new Map()

    for (const noticia of noticias) {
        // Detectar entidades en el título
        const entities = detectEntities(noticia.titulo)
        const mainEntity = entities[0] || null

        // Usar categoría + entidad principal como clave de cluster
        const clusterKey = mainEntity
            ? `${noticia.categoria.toLowerCase()}-${mainEntity.toLowerCase()}`
            : noticia.categoria.toLowerCase()

        if (!clusters.has(clusterKey)) {
            clusters.set(clusterKey, {
                theme: noticia.categoria,
                mainEntity: mainEntity || undefined,
                news: []
            })
        }

        clusters.get(clusterKey)!.news.push(noticia)
    }

    // Ordenar clusters: primero los que tienen noticias destacadas
    return Array.from(clusters.values()).sort((a, b) => {
        const aHasDestacada = a.news.some(n => n.es_destacada) ? 1 : 0
        const bHasDestacada = b.news.some(n => n.es_destacada) ? 1 : 0
        return bHasDestacada - aHasDestacada
    })
}

// ==================================================
// TRANSICIONES CONTEXTUALES
// ==================================================
const SAME_THEME_TRANSITIONS = [
    'Siguiendo con este tema,',
    'Y relacionado con esto,',
    'Continuando en el mismo ámbito,',
    'También sobre este tema,',
    'En la misma línea,'
]

const SAME_ENTITY_TRANSITIONS = [
    'Y volviendo al tema de {entity},',
    'Precisamente sobre {entity},',
    'Siguiendo con las noticias de {entity},',
    'Más información sobre {entity}:'
]

const DIFFERENT_THEME_TRANSITIONS: { [key: string]: string[] } = {
    economia: [
        'Pasando a la economía,',
        'Y en el mundo financiero,',
        '¿Y cómo va la economía?',
        'Veamos qué pasa en los mercados.'
    ],
    deportes: [
        'Cambiando el tono, vamos al deporte.',
        'Y en deportes,',
        'Para los fanáticos del deporte,',
        'Ahora, noticias deportivas.'
    ],
    politica: [
        'En el ámbito político,',
        'Pasando a la política,',
        'Y en La Moneda,',
        'En noticias políticas,'
    ],
    nacionales: [
        'En noticias nacionales,',
        'Y a nivel país,',
        'Veamos qué pasa en Chile.',
        'En otras noticias del país,'
    ],
    regionales: [
        'A nivel regional,',
        'En nuestra zona,',
        'Y en la región,',
        'Noticias de nuestra zona:'
    ],
    tecnologia: [
        'En tecnología,',
        'Y en el mundo tech,',
        'Para los amantes de la tecnología,',
        'En noticias de tecnología,'
    ],
    mundo: [
        'En el escenario internacional,',
        'Y en el mundo,',
        'Mirando más allá de nuestras fronteras,',
        'En noticias internacionales,'
    ]
}

function getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

export function generateTransition(
    fromNews: NewsForScript | null,
    toNews: NewsForScript,
    toCluster: NewsCluster
): string {
    // Primera noticia - no necesita transición larga
    if (!fromNews) {
        if (toNews.es_destacada) {
            return 'La noticia principal del día:'
        }
        return 'Comenzamos con:'
    }

    const fromCategory = fromNews.categoria.toLowerCase()
    const toCategory = toNews.categoria.toLowerCase()
    const fromEntities = detectEntities(fromNews.titulo)
    const toEntities = detectEntities(toNews.titulo)

    // Misma entidad principal
    const sharedEntity = fromEntities.find(e => toEntities.includes(e))
    if (sharedEntity) {
        const template = getRandomItem(SAME_ENTITY_TRANSITIONS)
        return template.replace('{entity}', sharedEntity)
    }

    // Mismo tema/categoría
    if (fromCategory === toCategory) {
        return getRandomItem(SAME_THEME_TRANSITIONS)
    }

    // Diferente tema - usar transición específica
    const categoryTransitions = DIFFERENT_THEME_TRANSITIONS[toCategory] ||
        DIFFERENT_THEME_TRANSITIONS['nacionales']

    return getRandomItem(categoryTransitions)
}

// ==================================================
// COMENTARIOS DE LOCUTOR
// ==================================================
const COMMENTS_BY_CATEGORY: { [key: string]: string[] } = {
    politica: [
        'Sin duda, un momento histórico.',
        'Habrá que seguir de cerca este tema.',
        'La política no da tregua.',
        'Un hecho que marcará la agenda.'
    ],
    economia: [
        'Buenas noticias para los mercados.',
        'Habrá que ver cómo evoluciona.',
        'Los inversionistas estarán atentos.',
        'Un dato a considerar.'
    ],
    deportes: [
        'Qué emoción para los fanáticos.',
        'El deporte no descansa.',
        'Una noticia que alegra.',
        'Los hinchas celebran.'
    ],
    mundo: [
        'El mundo no se detiene.',
        'Noticias que nos llegan de afuera.',
        'Habrá que estar atentos.',
        'Una situación compleja.'
    ],
    general: [
        'Una noticia importante.',
        'Manténganse informados.',
        'Seguiremos reportando.',
        'Pendientes de novedades.'
    ]
}

export function generateComment(news: NewsForScript): string | null {
    // Solo generar comentarios para noticias destacadas o importantes
    if (!news.es_destacada && news.segundos_asignados < 60) {
        return null
    }

    const category = news.categoria.toLowerCase()
    const comments = COMMENTS_BY_CATEGORY[category] || COMMENTS_BY_CATEGORY['general']

    return getRandomItem(comments)
}

// ==================================================
// PREGUNTAS RETÓRICAS
// ==================================================
const RHETORICAL_QUESTIONS: { [key: string]: string[] } = {
    economia: [
        '¿Y cómo reaccionó el mercado?',
        '¿Qué pasa con la economía?',
        '¿Cómo afecta esto a los chilenos?'
    ],
    deportes: [
        '¿Y en deportes, qué pasó?',
        '¿Cómo le fue a nuestros equipos?',
        '¿Qué novedades hay en el deporte?'
    ],
    politica: [
        '¿Y qué dice la oposición?',
        '¿Cómo reacciona el gobierno?',
        '¿Qué se espera ahora?'
    ],
    tecnologia: [
        '¿Y en tecnología?',
        '¿Qué hay de nuevo en tech?'
    ]
}

export function generateQuestion(forCategory: string): string | null {
    const category = forCategory.toLowerCase()
    const questions = RHETORICAL_QUESTIONS[category]

    if (!questions) return null

    return getRandomItem(questions)
}

// ==================================================
// PAUSAS Y TRANSICIONES A PUBLICIDAD
// ==================================================
const PAUSE_TRANSITIONS = [
    'Volvemos en un momento con más noticias.',
    'No se vayan, seguimos después de la pausa.',
    'En breve, más información.',
    'Hacemos una pausa y continuamos.'
]

const RETURN_TRANSITIONS = [
    'Y seguimos con más noticias.',
    'Continuamos con el informativo.',
    'Volvemos con más información.',
    'Retomamos las noticias.'
]

// ==================================================
// CONSTRUCTOR PRINCIPAL DEL SCRIPT
// ==================================================
export function buildFullScript(input: BuildScriptInput): BuiltScript {
    const segments: ScriptSegment[] = []
    const secondsPerWord = 60 / input.wpm

    // 1. Agrupar noticias por tema
    const clusters = clusterByTheme(input.noticias)

    // 2. Calcular tiempo disponible para extras (transiciones, comentarios)
    const newsTime = input.noticias.reduce((sum, n) => sum + n.segundos_asignados, 0)
    const introOutroTime = 30 // 15s intro + 15s outro
    let extraTimeAvailable = input.duracionObjetivoSegundos - newsTime - introOutroTime

    // Limitar extras al 10% del tiempo total para no exceder duración
    const maxExtraTime = input.duracionObjetivoSegundos * 0.10
    extraTimeAvailable = Math.min(extraTimeAvailable, maxExtraTime)

    let extraTimeUsed = 0

    // Constantes de tiempo para cada tipo de segmento
    const TRANSITION_SECONDS = 3
    const COMMENT_SECONDS = 4
    const QUESTION_SECONDS = 3
    const PAUSE_SECONDS = 4

    // 3. Construir secuencia de segmentos
    let previousNews: NewsForScript | null = null
    let newsIndex = 0
    let insertedAdPause = false

    for (let clusterIdx = 0; clusterIdx < clusters.length; clusterIdx++) {
        const cluster = clusters[clusterIdx]

        // Pregunta retórica antes de cambiar a nuevo cluster (si aplica)
        if (clusterIdx > 0 && input.incluirPreguntasRetoricas) {
            const question = generateQuestion(cluster.theme)
            if (question && extraTimeUsed + QUESTION_SECONDS <= extraTimeAvailable) {
                segments.push({
                    type: 'question',
                    content: question,
                    estimatedSeconds: QUESTION_SECONDS
                })
                extraTimeUsed += QUESTION_SECONDS
            }
        }

        for (const noticia of cluster.news) {
            // Transición contextual
            const transition = generateTransition(previousNews, noticia, cluster)
            if (transition && extraTimeUsed + TRANSITION_SECONDS <= extraTimeAvailable) {
                segments.push({
                    type: 'transition',
                    content: transition,
                    estimatedSeconds: TRANSITION_SECONDS
                })
                extraTimeUsed += TRANSITION_SECONDS
            }

            // La noticia en sí
            segments.push({
                type: 'news',
                content: '', // El contenido se llena después por humanize
                newsId: noticia.id,
                estimatedSeconds: noticia.segundos_asignados,
                context: noticia.es_destacada ? 'destacada' : 'normal'
            })

            // Comentario de locutor (para noticias destacadas)
            if (input.incluirComentarios && noticia.es_destacada) {
                const comment = generateComment(noticia)
                if (comment && extraTimeUsed + COMMENT_SECONDS <= extraTimeAvailable) {
                    segments.push({
                        type: 'comment',
                        content: comment,
                        estimatedSeconds: COMMENT_SECONDS
                    })
                    extraTimeUsed += COMMENT_SECONDS
                }
            }

            previousNews = noticia
            newsIndex++

            // Insertar pausa para publicidad a mitad del noticiero
            if (!insertedAdPause && newsIndex >= Math.floor(input.noticias.length / 2)) {
                segments.push({
                    type: 'pause',
                    content: getRandomItem(PAUSE_TRANSITIONS),
                    estimatedSeconds: PAUSE_SECONDS
                })
                insertedAdPause = true
            }
        }
    }

    // 4. Calcular duración total estimada
    const duracionTotalEstimada = segments.reduce((sum, s) => sum + s.estimatedSeconds, 0) + introOutroTime

    console.log(`📜 Script Builder: ${segments.length} segmentos`)
    console.log(`   ⏱️ Tiempo noticias: ${newsTime}s`)
    console.log(`   ➕ Tiempo extras usado: ${extraTimeUsed}s (max: ${Math.round(maxExtraTime)}s)`)
    console.log(`   📊 Duración total estimada: ${duracionTotalEstimada}s`)

    return {
        segments,
        duracionTotalEstimada,
        clusters
    }
}

// ==================================================
// APLANAR SCRIPT A TEXTO
// ==================================================
export function flattenScriptToText(script: BuiltScript): string {
    return script.segments
        .filter(s => s.type !== 'news') // Las noticias se procesan aparte
        .map(s => s.content)
        .join(' ')
}

// ==================================================
// OBTENER TRANSICIONES PARA INTEGRAR EN NOTICIAS
// ==================================================
export interface NewsTransitions {
    preText: string   // Texto a agregar ANTES del contenido de la noticia
    postText: string  // Texto a agregar DESPUÉS del contenido de la noticia
}

export function getTransitionsForNews(
    script: BuiltScript
): Map<string, NewsTransitions> {
    const result = new Map<string, NewsTransitions>()

    let currentNewsId: string | null = null
    let pendingPreTexts: string[] = []

    for (let i = 0; i < script.segments.length; i++) {
        const seg = script.segments[i]

        if (seg.type === 'news') {
            // Guardar los textos pendientes como preText de esta noticia
            if (seg.newsId) {
                result.set(seg.newsId, {
                    preText: pendingPreTexts.join(' ').trim(),
                    postText: ''
                })
                currentNewsId = seg.newsId
                pendingPreTexts = []
            }
        } else if (seg.type === 'transition' || seg.type === 'question') {
            // Las transiciones/preguntas van ANTES de la siguiente noticia
            pendingPreTexts.push(seg.content)
        } else if (seg.type === 'comment' && currentNewsId) {
            // Los comentarios van DESPUÉS de la noticia actual
            const existing = result.get(currentNewsId)
            if (existing) {
                existing.postText = (existing.postText + ' ' + seg.content).trim()
            }
        } else if (seg.type === 'pause' && currentNewsId) {
            // Las pausas van después de la noticia actual (antes de publicidad)
            const existing = result.get(currentNewsId)
            if (existing) {
                existing.postText = (existing.postText + ' ' + seg.content).trim()
            }
        }
    }

    return result
}
