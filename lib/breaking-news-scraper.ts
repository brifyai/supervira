
/**
 * VIRA - Breaking News Scraper para Chile
 * Scraper optimizado para noticias de último minuto de fuentes chilenas
 */

interface NewsSource {
  id: string
  name: string
  url: string
  rss_url?: string
  region: string
  category: string
  priority: 'high' | 'medium' | 'low'
  reliability: number // 0-1
}

interface BreakingNewsItem {
  title: string
  content: string
  summary?: string
  url: string
  source: string
  category: string
  region: string
  urgency: 'high' | 'medium' | 'low'
  sentiment: 'positive' | 'negative' | 'neutral'
  published_date: string
  author?: string
  image_url?: string
  keywords: string[]
}

// Fuentes de noticias chilenas priorizadas para último minuto
export const CHILE_BREAKING_NEWS_SOURCES: NewsSource[] = [
  {
    id: 'emol',
    name: 'El Mercurio Online',
    url: 'https://www.emol.com',
    rss_url: 'https://www.emol.com/rss/rss.asp',
    region: 'nacional',
    category: 'general',
    priority: 'high',
    reliability: 0.9
  },
  {
    id: 'latercera',
    name: 'La Tercera',
    url: 'https://www.latercera.com',
    rss_url: 'https://www.latercera.com/feed/',
    region: 'nacional',
    category: 'general',
    priority: 'high',
    reliability: 0.9
  },
  {
    id: 'biobio',
    name: 'BioBioChile',
    url: 'https://www.biobiochile.cl',
    rss_url: 'https://www.biobiochile.cl/especial/rss/index.xml',
    region: 'nacional',
    category: 'general',
    priority: 'high',
    reliability: 0.85
  },
  {
    id: 't13',
    name: 'Tele 13',
    url: 'https://www.t13.cl',
    rss_url: 'https://www.t13.cl/rss/portada.xml',
    region: 'nacional',
    category: 'general',
    priority: 'high',
    reliability: 0.9
  },
  {
    id: '24horas',
    name: '24 Horas',
    url: 'https://www.24horas.cl',
    rss_url: 'https://www.24horas.cl/rss/',
    region: 'nacional',
    category: 'general',
    priority: 'high',
    reliability: 0.85
  },
  {
    id: 'cooperativa',
    name: 'Radio Cooperativa',
    url: 'https://cooperativa.cl',
    rss_url: 'https://cooperativa.cl/noticias/rss/',
    region: 'nacional',
    category: 'general',
    priority: 'medium',
    reliability: 0.8
  },
  {
    id: 'chv',
    name: 'Chilevisión',
    url: 'https://www.chilevision.cl',
    region: 'nacional',
    category: 'general',
    priority: 'medium',
    reliability: 0.75
  }
]

// Palabras clave para determinar urgencia de noticias
export const URGENCY_KEYWORDS = {
  high: [
    'urgente', 'último minuto', 'breaking news', 'alerta', 'emergencia',
    'evacuación', 'terremoto', 'tsunami', 'accidente grave', 'explosión',
    'incendio masivo', 'balacera', 'tiroteo', 'atentado', 'crisis',
    'estado de emergencia', 'toque de queda', 'paro nacional'
  ],
  medium: [
    'importante', 'significativo', 'relevante', 'decisión clave',
    'anuncio oficial', 'medida gubernamental', 'cambio político',
    'inversión millonaria', 'empresa importante', 'deportista destacado',
    'descubrimiento', 'innovación', 'acuerdo comercial'
  ],
  indicators: [
    'presidente', 'ministro', 'gobierno', 'congreso', 'senado',
    'carabineros', 'pdi', 'bomberos', 'onemi', 'shoa',
    'banco central', 'peso chileno', 'inflación', 'pib'
  ]
}

// Categorías específicas para Chile
export const CHILE_CATEGORIES = {
  politica: ['gobierno', 'presidente', 'ministro', 'congreso', 'senado', 'diputado'],
  economia: ['peso', 'inflación', 'banco central', 'empresas', 'inversión', 'comercio'],
  seguridad: ['carabineros', 'pdi', 'delincuencia', 'narcotráfico', 'robo', 'asalto'],
  clima: ['temporal', 'lluvia', 'nieve', 'sequía', 'meteorología', 'temperatura'],
  deportes: ['fútbol', 'tenis', 'atletismo', 'selección', 'campeonato', 'mundial'],
  salud: ['ministerio salud', 'hospital', 'vacuna', 'pandemia', 'epidemia', 'brote'],
  internacional: ['venezuela', 'argentina', 'bolivia', 'perú', 'brasil', 'eeuu'],
  tecnologia: ['startup', 'innovación', 'inteligencia artificial', 'internet', 'móvil'],
  cultura: ['festival', 'premio', 'artista', 'música', 'cine', 'literatura']
}

/**
 * Scraper principal para noticias de último minuto
 */
export class BreakingNewsScraper {
  private sources: NewsSource[]
  
  constructor(customSources?: NewsSource[]) {
    this.sources = customSources || CHILE_BREAKING_NEWS_SOURCES
  }

  /**
   * Obtener noticias de último minuto según criterios
   */
  async scrapeBreakingNews(options: {
    timeFrameHours: number
    region?: string
    category?: string
    urgentOnly?: boolean
    maxResults?: number
  }): Promise<BreakingNewsItem[]> {
    const { timeFrameHours, region, category, urgentOnly = false, maxResults = 50 } = options
    
    console.log('Scraping breaking news with options:', options)

    const startDate = new Date()
    startDate.setHours(startDate.getHours() - timeFrameHours)

    // Filtrar fuentes por región si se especifica
    let relevantSources = this.sources
    if (region && region !== 'all' && region !== 'nacional') {
      relevantSources = this.sources.filter(s => 
        s.region === region || s.region === 'nacional'
      )
    }

    const allNews: BreakingNewsItem[] = []

    // Scraper cada fuente
    for (const source of relevantSources) {
      try {
        const sourceNews = await this.scrapeSource(source, startDate, category)
        
        // Filtrar por urgencia si se solicita
        const filteredNews = urgentOnly 
          ? sourceNews.filter(news => news.urgency === 'high')
          : sourceNews
        
        allNews.push(...filteredNews)
      } catch (error) {
        console.error(`Error scraping ${source.name}:`, error)
        // Continuar con otras fuentes
      }
    }

    // Procesar y ordenar noticias
    const processedNews = this.processAndRankNews(allNews)
    
    // Limitar resultados
    return processedNews.slice(0, maxResults)
  }

  /**
   * Scraper individual para una fuente
   */
  private async scrapeSource(
    source: NewsSource, 
    startDate: Date, 
    category?: string
  ): Promise<BreakingNewsItem[]> {
    // Datos simulados mejorados basados en fuentes reales chilenas
    const simulatedNews = this.generateRealisticChileanNews(source, startDate)
    
    // En producción, aquí usarías:
    // - RSS parsing para fuentes con RSS
    // - Puppeteer/Playwright para scraping directo
    // - APIs oficiales cuando estén disponibles
    
    return simulatedNews.filter(news => {
      // Filtrar por categoría si se especifica
      if (category && category !== 'all') {
        return news.category === category
      }
      return true
    })
  }

  /**
   * Generar noticias realistas para Chile
   */
  private generateRealisticChileanNews(source: NewsSource, startDate: Date): BreakingNewsItem[] {
    const now = new Date()
    const timeRange = now.getTime() - startDate.getTime()

    // Templates de noticias por fuente y región
    const newsTemplates = this.getNewsTemplatesBySource(source)
    
    return newsTemplates.map((template, index) => {
      const publishTime = new Date(startDate.getTime() + Math.random() * timeRange)
      
      return {
        title: template.title,
        content: template.content,
        summary: template.summary,
        url: `${source.url}/${template.slug}`,
        source: source.name,
        category: template.category,
        region: template.region || source.region,
        urgency: this.calculateUrgency(template.title, template.content),
        sentiment: this.calculateSentiment(template.content),
        published_date: publishTime.toISOString(),
        author: template.author,
        keywords: this.extractKeywords(template.title + ' ' + template.content)
      }
    }).filter(news => new Date(news.published_date) >= startDate)
  }

  /**
   * Templates de noticias por fuente
   */
  private getNewsTemplatesBySource(source: NewsSource) {
    const baseTemplates = [
      {
        title: "Gobierno anuncia nuevas medidas económicas para enfrentar la inflación",
        content: "El Ministerio de Hacienda presentó hoy un paquete de medidas para controlar el alza de precios que afecta a las familias chilenas. Las medidas incluyen subsidios focalizados y controles de precios en productos de primera necesidad.",
        summary: "Nuevas medidas gubernamentales contra la inflación",
        slug: "medidas-economicas-inflacion",
        category: "economia",
        region: "nacional",
        author: "Equipo Económico " + source.name
      },
      {
        title: "Fuerte temporal afecta la región central con vientos de hasta 120 km/h",
        content: "Un intenso sistema frontal está causando severos daños en las regiones de Valparaíso y Metropolitana. Se reportan cortes de luz masivos y caída de árboles. Autoridades recomiendan no salir a menos que sea estrictamente necesario.",
        summary: "Temporal severo azota la región central",
        slug: "temporal-region-central",
        category: "clima",
        region: "Valparaíso",
        author: "Meteorología " + source.name
      },
      {
        title: "Accidente múltiple en autopista genera grave congestión vehicular",
        content: "Un choque en cadena que involucra 7 vehículos en la Ruta 5 Sur ha generado una congestión de más de 15 kilómetros. Bomberos y Carabineros trabajan en el lugar. Se reportan al menos 3 personas heridas.",
        summary: "Grave accidente causa congestión masiva",
        slug: "accidente-multiple-autopista",
        category: "transporte",
        region: "Metropolitana de Santiago",
        author: "Reportero de Tránsito"
      },
      {
        title: "Empresa chilena de tecnología recibe inversión record de $100 millones",
        content: "Una startup chilena especializada en inteligencia artificial logró la mayor ronda de financiamiento del sector tech nacional. Los fondos serán destinados a expansión regional y desarrollo de nuevos productos.",
        summary: "Startup chilena logra inversión histórica",
        slug: "startup-inversion-record",
        category: "tecnologia",
        region: "Metropolitana de Santiago",
        author: "Editor de Tecnología"
      },
      {
        title: "Selección chilena clasifica al próximo Mundial tras victoria histórica",
        content: "La Roja logró una victoria épica que la lleva directo al Mundial. Miles de fanáticos celebran en las calles principales del país. El técnico destacó el esfuerzo de todo el equipo.",
        summary: "Chile clasifica al Mundial de fútbol",
        slug: "chile-clasificacion-mundial",
        category: "deportes",
        region: "nacional",
        author: "Corresponsal Deportivo"
      },
      {
        title: "Incendio forestal amenaza zona residencial en la región del Biobío",
        content: "Un incendio de grandes proporciones se acerca peligrosamente a sectores habitados. CONAF y Bomberos luchan contra las llamas. Se ha decretado alerta roja y evacuación preventiva.",
        summary: "Incendio forestal amenaza viviendas",
        slug: "incendio-forestal-biobio",
        category: "emergencia",
        region: "Biobío",
        author: "Equipo de Emergencias"
      }
    ]

    // Personalizar por fuente
    return baseTemplates.map(template => ({
      ...template,
      author: template.author || source.name
    }))
  }

  /**
   * Calcular urgencia de una noticia
   */
  private calculateUrgency(title: string, content: string): 'high' | 'medium' | 'low' {
    const text = (title + ' ' + content).toLowerCase()
    
    // Contar coincidencias con palabras clave de alta urgencia
    const highUrgencyMatches = URGENCY_KEYWORDS.high.filter(keyword => 
      text.includes(keyword)
    ).length

    // Contar coincidencias con palabras clave de mediana urgencia
    const mediumUrgencyMatches = URGENCY_KEYWORDS.medium.filter(keyword => 
      text.includes(keyword)
    ).length

    // Contar indicadores importantes
    const indicatorMatches = URGENCY_KEYWORDS.indicators.filter(keyword => 
      text.includes(keyword)
    ).length

    if (highUrgencyMatches >= 2) return 'high'
    if (highUrgencyMatches >= 1 || (mediumUrgencyMatches >= 2 && indicatorMatches >= 1)) return 'medium'
    if (mediumUrgencyMatches >= 1 || indicatorMatches >= 2) return 'medium'
    
    return 'low'
  }

  /**
   * Calcular sentimiento de la noticia
   */
  private calculateSentiment(content: string): 'positive' | 'negative' | 'neutral' {
    const text = content.toLowerCase()
    
    const positiveWords = [
      'éxito', 'logro', 'victoria', 'crecimiento', 'mejora', 'beneficio',
      'inversión', 'desarrollo', 'innovación', 'avance', 'clasificación',
      'récord', 'histórico', 'celebrar', 'progreso'
    ]
    
    const negativeWords = [
      'accidente', 'crisis', 'problema', 'daño', 'pérdida', 'amenaza',
      'peligro', 'emergencia', 'incendio', 'temporal', 'congestión',
      'heridos', 'evacuación', 'alerta', 'grave'
    ]
    
    const positiveCount = positiveWords.filter(word => text.includes(word)).length
    const negativeCount = negativeWords.filter(word => text.includes(word)).length
    
    if (positiveCount > negativeCount + 1) return 'positive'
    if (negativeCount > positiveCount + 1) return 'negative'
    
    return 'neutral'
  }

  /**
   * Extraer palabras clave relevantes
   */
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/)
    const keywords = new Set<string>()

    // Buscar en todas las categorías
    Object.entries(CHILE_CATEGORIES).forEach(([category, categoryWords]) => {
      categoryWords.forEach(keyword => {
        if (text.toLowerCase().includes(keyword)) {
          keywords.add(keyword)
        }
      })
    })

    // Agregar palabras de urgencia encontradas
    URGENCY_KEYWORDS.high.concat(URGENCY_KEYWORDS.medium, URGENCY_KEYWORDS.indicators)
      .forEach(keyword => {
        if (text.toLowerCase().includes(keyword)) {
          keywords.add(keyword)
        }
      })

    return Array.from(keywords).slice(0, 10) // Máximo 10 keywords
  }

  /**
   * Procesar y rankear noticias por relevancia
   */
  private processAndRankNews(news: BreakingNewsItem[]): BreakingNewsItem[] {
    // Eliminar duplicados por título similar
    const uniqueNews = this.removeDuplicates(news)
    
    // Ordenar por urgencia, fecha y relevancia
    return uniqueNews.sort((a, b) => {
      // Prioridad por urgencia
      const urgencyOrder = { 'high': 3, 'medium': 2, 'low': 1 }
      const urgencyDiff = urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
      if (urgencyDiff !== 0) return urgencyDiff
      
      // Luego por fecha (más reciente primero)
      const timeDiff = new Date(b.published_date).getTime() - new Date(a.published_date).getTime()
      if (Math.abs(timeDiff) > 60000) return timeDiff // Si la diferencia es mayor a 1 minuto
      
      // Finalmente por cantidad de keywords (más relevante)
      return b.keywords.length - a.keywords.length
    })
  }

  /**
   * Remover noticias duplicadas
   */
  private removeDuplicates(news: BreakingNewsItem[]): BreakingNewsItem[] {
    const seen = new Set<string>()
    return news.filter(item => {
      // Crear un hash simple del título normalizado
      const normalized = item.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
      const key = normalized.substring(0, 50) // Primeros 50 caracteres
      
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }
}

/**
 * Función helper para uso directo
 */
export async function getBreakingNews(options: {
  timeFrameHours: number
  region?: string
  category?: string
  urgentOnly?: boolean
  maxResults?: number
}): Promise<BreakingNewsItem[]> {
  const scraper = new BreakingNewsScraper()
  return await scraper.scrapeBreakingNews(options)
}
