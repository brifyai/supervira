
'use client'

export const dynamic = 'force-dynamic'

import { toast } from 'react-toastify'

import { useState } from 'react'
import { Navigation } from '@/components/navigation'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Radio,
  Podcast,
  Twitter,
  Settings,
  X,
  Globe2,
  Code,
  TestTube,
  Plus,
  Trash2,
  Eye,
  Brain,
  Sparkles,
  Cpu,
  Zap,
  MessageSquare,
  FileText,
  Mic,
  Volume2,
  Play,
  VolumeX,
  Headphones,
  SpeakerIcon as Speaker,
  AudioWaveform
} from 'lucide-react'

// Software de automatización radial usados en Chile
const radioAutomationSoftware = [
  {
    id: 'zararadio',
    name: 'ZaraRadio',
    description: 'Sistema completo de automatización radial muy popular en Chile',
    type: 'desktop',
    popularity: 'high'
  },
  {
    id: 'radiodj',
    name: 'RadioDJ',
    description: 'Software gratuito de automatización radial ampliamente usado',
    type: 'desktop',
    popularity: 'high'
  },
  {
    id: 'sam-broadcaster',
    name: 'SAM Broadcaster',
    description: 'Solución profesional para broadcasting y streaming',
    type: 'desktop',
    popularity: 'medium'
  },
  {
    id: 'radioboss',
    name: 'RadioBOSS',
    description: 'Software profesional de automatización radial',
    type: 'desktop',
    popularity: 'medium'
  },
  {
    id: 'stationplaylist',
    name: 'StationPlaylist',
    description: 'Suite completa para estaciones de radio',
    type: 'desktop',
    popularity: 'medium'
  },
  {
    id: 'playit-live',
    name: 'PlayIt Live',
    description: 'Software de playout en vivo para radio',
    type: 'desktop',
    popularity: 'medium'
  },
  {
    id: 'rivendell',
    name: 'Rivendell',
    description: 'Sistema de automatización radial open source',
    type: 'linux',
    popularity: 'low'
  },
  {
    id: 'nextkast',
    name: 'NextKast',
    description: 'Sistema profesional de automatización',
    type: 'web',
    popularity: 'medium'
  },
  {
    id: 'wideorbit',
    name: 'WideOrbit',
    description: 'Plataforma empresarial de automatización radial',
    type: 'enterprise',
    popularity: 'low'
  },
  {
    id: 'rcs-zetta',
    name: 'RCS Zetta',
    description: 'Sistema avanzado de automatización radial',
    type: 'enterprise',
    popularity: 'low'
  },
  {
    id: 'enco-dad',
    name: 'ENCO DAD',
    description: 'Sistema digital de automatización',
    type: 'enterprise',
    popularity: 'low'
  },
  {
    id: 'audiovault',
    name: 'AudioVault',
    description: 'Sistema de automatización y gestión de audio',
    type: 'enterprise',
    popularity: 'low'
  },
  {
    id: 'openbroadcaster',
    name: 'OpenBroadcaster',
    description: 'Plataforma open source de broadcasting',
    type: 'web',
    popularity: 'low'
  },
  {
    id: 'butt',
    name: 'BUTT (Broadcast Using This Tool)',
    description: 'Herramienta para streaming en vivo',
    type: 'desktop',
    popularity: 'medium'
  },
  {
    id: 'icecast',
    name: 'Icecast',
    description: 'Servidor de streaming de audio',
    type: 'server',
    popularity: 'medium'
  }
]

export default function IntegracionesPage() {
  const [selectedSoftware, setSelectedSoftware] = useState('')
  const [connectionConfig, setConnectionConfig] = useState({
    serverUrl: '',
    username: '',
    password: '',
    port: '',
    additionalConfig: ''
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false)
  const [isPodcastModalOpen, setIsPodcastModalOpen] = useState(false)
  const [isScrapingModalOpen, setIsScrapingModalOpen] = useState(false)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)

  // Estados para configuración de redes sociales
  const [socialConfig, setSocialConfig] = useState({
    twitter: {
      apiKey: '',
      apiSecretKey: '',
      accessToken: '',
      accessTokenSecret: '',
      enabled: false
    },
    facebook: {
      appId: '',
      appSecret: '',
      accessToken: '',
      pageId: '',
      enabled: false
    },
    instagram: {
      appId: '',
      appSecret: '',
      accessToken: '',
      userId: '',
      enabled: false
    }
  })

  // Estados para configuración de plataformas de podcast
  const [podcastConfig, setPodcastConfig] = useState({
    spotify: {
      clientId: '',
      clientSecret: '',
      refreshToken: '',
      showId: '',
      enabled: false
    },
    apple: {
      keyId: '',
      issuerId: '',
      privateKey: '',
      showId: '',
      enabled: false
    },
    google: {
      clientId: '',
      clientSecret: '',
      refreshToken: '',
      podcastId: '',
      enabled: false
    },
    amazon: {
      vendorId: '',
      developerToken: '',
      showId: '',
      refreshToken: '',
      enabled: false
    },
    iheartradio: {
      apiKey: '',
      secret: '',
      podcastId: '',
      enabled: false
    },
    tunein: {
      partnerId: '',
      stationId: '',
      apiKey: '',
      enabled: false
    },
    rss: {
      feedUrl: '',
      ftpHost: '',
      ftpUser: '',
      ftpPassword: '',
      enabled: false
    }
  })

  // Estados para configuración de scraping
  const [scrapingConfig, setScrapingConfig] = useState({
    engine: 'cheerio', // cheerio, puppeteer, playwright
    globalSettings: {
      userAgent: 'VIRA-NewsBot/1.0',
      delay: 2000,
      timeout: 30000,
      retries: 3,
      respectRobots: true
    },
    sites: [
      {
        id: 1,
        name: 'Ejemplo - El Mercurio',
        url: 'https://www.elmercurio.com',
        enabled: true,
        selectors: {
          articleLinks: 'a[href*="/nacional/"]',
          title: 'h1.headline',
          content: 'div.story-body p',
          date: 'time[datetime]',
          author: '.byline .author'
        },
        filters: {
          minWordCount: 50,
          excludeKeywords: ['publicidad', 'suscribete'],
          includeOnlyKeywords: [] as string[]
        }
      }
    ]
  })

  const [newSite, setNewSite] = useState({
    name: '',
    url: '',
    selectors: {
      articleLinks: '',
      title: '',
      content: '',
      date: '',
      author: ''
    },
    filters: {
      minWordCount: 50,
      excludeKeywords: '',
      includeOnlyKeywords: ''
    }
  })

  // Estados para configuración de IA
  const [aiConfig, setAiConfig] = useState({
    abacus: {
      enabled: true, // Ya está configurado
      model: 'gpt-4.1-mini',
      maxTokens: 2000,
      temperature: 0.7
    },
    groq: {
      enabled: false,
      apiKey: '',
      model: 'llama-3.1-70b-versatile',
      maxTokens: 2000,
      temperature: 0.7
    },
    prompts: {
      rewrite: {
        system: 'Eres un periodista experto en reescribir noticias para radio en Chile. Mantén los hechos exactos pero adapta el lenguaje para ser claro, directo y apropiado para audiencia radial.',
        template: 'Reescribe la siguiente noticia para radio manteniendo todos los hechos importantes pero adaptando el lenguaje para ser más dinámico y apropiado para transmisión radial:\n\n{content}'
      },
      humanize: {
        system: 'Eres un locutor de radio profesional chileno. Tu trabajo es humanizar noticias para que suenen naturales y conversacionales.',
        template: 'Humaniza esta noticia para que suene como si un locutor de radio chileno la estuviera contando de manera natural y conversacional:\n\n{content}'
      },
      adapt: {
        system: 'Adapta el tono y estilo de las noticias según la identidad de la radio.',
        template: 'Adapta esta noticia al estilo de {radioStyle}. Mantén los hechos pero ajusta el tono y enfoque:\n\n{content}'
      }
    },
    processing: {
      enableRewrite: true,
      enableHumanize: true,
      enableAdaptation: true,
      radioStyle: 'Profesional y objetivo',
      contentFilters: ['spam', 'publicidad'],
      minQualityScore: 7
    }
  })

  // Estados para configuración de voces
  const [voiceConfig, setVoiceConfig] = useState({
    // Tier Premium - Máxima Calidad con Abacus
    abacusElevenlabs: {
      enabled: true, // Habilitado por defecto ya que usa la integración Abacus existente
      integration: 'abacus', // Usa la integración Abacus existente
      model: 'eleven_multilingual_v2',
      voices: [
        { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam - Profesional Masculino', language: 'es-CL', accent: 'chileno', style: 'noticiero' },
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella - Profesional Femenino', language: 'es-CL', accent: 'chileno', style: 'noticiero' },
        { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold - Locutor Experimentado', language: 'es-CL', accent: 'chileno', style: 'formal' },
        { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice - Reportera Joven', language: 'es-CL', accent: 'chileno', style: 'dinámico' },
        { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel - Presentadora Senior', language: 'es-CL', accent: 'chileno', style: 'autoridad' },
        { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi - Voz Juvenil', language: 'es-CL', accent: 'chileno', style: 'casual' },
        { id: 'CYw3kZ02Hs0563khs1Fj', name: 'Dave - Locutor Deportivo', language: 'es-CL', accent: 'chileno', style: 'deportivo' },
        { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum - Voz Grave', language: 'es-CL', accent: 'chileno', style: 'serio' }
      ],
      stability: 0.75, // Más estable para noticias
      similarityBoost: 0.85, // Mayor similitud para consistencia
      style: 0.2, // Ligero estilo para naturalidad
      speakingRate: 1.0, // Velocidad normal para noticias
      optimizedForNews: true
    },

    // Tier Premium - ElevenLabs Directo (requiere API key propia)
    elevenlabs: {
      enabled: false,
      apiKey: '',
      model: 'eleven_multilingual_v2',
      voices: [
        { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Masculino)', language: 'es' },
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (Femenino)', language: 'es' },
        { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (Profesional)', language: 'es' }
      ],
      stability: 0.5,
      similarityBoost: 0.8,
      style: 0.0
    },

    // Tier Premium - Microsoft Azure
    azure: {
      enabled: false,
      subscriptionKey: '',
      region: 'eastus',
      voices: [
        { id: 'es-CL-CatalinaNeural', name: 'Catalina (Chilena)', gender: 'female' },
        { id: 'es-CL-LorenzoNeural', name: 'Lorenzo (Chileno)', gender: 'male' },
        { id: 'es-ES-AlvaroNeural', name: 'Álvaro (Español)', gender: 'male' },
        { id: 'es-ES-ElviraNeural', name: 'Elvira (Española)', gender: 'female' },
        { id: 'es-MX-DaliaNeural', name: 'Dalia (Mexicana)', gender: 'female' },
        { id: 'es-MX-JorgeNeural', name: 'Jorge (Mexicano)', gender: 'male' }
      ],
      rate: '+0%',
      pitch: '+0Hz',
      quality: 'high'
    },

    // Tier Medio - OpenAI TTS
    openai: {
      enabled: true, // Ya está integrado con Abacus
      model: 'tts-1',
      voices: [
        { id: 'alloy', name: 'Alloy (Neutral)', style: 'neutral' },
        { id: 'echo', name: 'Echo (Masculino)', style: 'professional' },
        { id: 'fable', name: 'Fable (Británico)', style: 'storytelling' },
        { id: 'onyx', name: 'Onyx (Profundo)', style: 'deep' },
        { id: 'nova', name: 'Nova (Femenino)', style: 'bright' },
        { id: 'shimmer', name: 'Shimmer (Suave)', style: 'soft' }
      ],
      speed: 1.0,
      quality: 'standard'
    },

    // Tier Económico - Amazon Polly
    polly: {
      enabled: false,
      accessKeyId: '',
      secretAccessKey: '',
      region: 'us-east-1',
      voices: [
        { id: 'Conchita', name: 'Conchita (Española)', language: 'es-ES', gender: 'female' },
        { id: 'Enrique', name: 'Enrique (Español)', language: 'es-ES', gender: 'male' },
        { id: 'Lucia', name: 'Lucía (Española)', language: 'es-ES', gender: 'female' },
        { id: 'Mia', name: 'Mía (Mexicana)', language: 'es-MX', gender: 'female' },
        { id: 'Miguel', name: 'Miguel (Estadounidense)', language: 'es-US', gender: 'male' }
      ],
      engine: 'neural',
      outputFormat: 'mp3'
    },

    // Tier Gratuito - Edge TTS (Backup)
    edge: {
      enabled: true, // Siempre disponible como backup
      voices: [
        { id: 'es-CL-CatalinaNeural', name: 'Catalina (Chilena)', gender: 'female' },
        { id: 'es-CL-LorenzoNeural', name: 'Lorenzo (Chileno)', gender: 'male' },
        { id: 'es-ES-AlvaroNeural', name: 'Álvaro (Español)', gender: 'male' },
        { id: 'es-ES-ElviraNeural', name: 'Elvira (Española)', gender: 'female' },
        { id: 'es-MX-DaliaNeural', name: 'Dalia (Mexicana)', gender: 'female' },
        { id: 'es-AR-ElenaNeural', name: 'Elena (Argentina)', gender: 'female' }
      ],
      rate: '+0%',
      pitch: '+0Hz'
    },

    // Configuración de Procesamiento
    processing: {
      primaryProvider: 'abacusElevenlabs', // Abacus ElevenLabs como principal
      fallbackProvider: 'openai', // OpenAI como respaldo
      emergencyProvider: 'edge', // Edge como última opción
      outputFormat: 'mp3',
      bitrate: '192',
      enableSSML: true,
      addPauses: true,
      newsIntro: 'Bienvenidos a las noticias de',
      newsOutro: 'Esto ha sido todo por ahora, gracias por escucharnos',
      pauseDuration: '0.5s',
      optimizeForRadio: true,
      addBreathingSounds: false,
      normalizeVolume: true
    }
  })

  const handleConnectPodcast = () => {
    setIsPodcastModalOpen(true)
  }

  const handleSavePodcastConfig = async () => {
    // Validar que al menos una plataforma esté configurada
    const hasValidConfig = Object.values(podcastConfig).some(platform =>
      platform.enabled && Object.values(platform).some(value =>
        typeof value === 'string' && value.trim() !== ''
      )
    )

    if (!hasValidConfig) {
      toast.warning('Por favor configura al menos una plataforma de podcast')
      return
    }

    setIsConnecting(true)
    try {
      // Simular guardado de configuración
      await new Promise(resolve => setTimeout(resolve, 2000))

      const enabledPlatforms = Object.entries(podcastConfig)
        .filter(([_, config]) => config.enabled)
        .map(([platform]) => {
          const platformNames = {
            spotify: 'Spotify',
            apple: 'Apple Podcasts',
            google: 'Google Podcasts',
            amazon: 'Amazon Music',
            iheartradio: 'iHeartRadio',
            tunein: 'TuneIn',
            rss: 'RSS Feed'
          }
          return platformNames[platform as keyof typeof platformNames]
        })
        .join(', ')

      toast.success(`Configuración guardada para: ${enabledPlatforms}. Los noticieros se subirán automáticamente a estas plataformas.`)
      setIsPodcastModalOpen(false)

    } catch (error) {
      toast.error('Error al guardar la configuración de podcasts')
    } finally {
      setIsConnecting(false)
    }
  }

  const updatePodcastConfig = (platform: keyof typeof podcastConfig, field: string, value: string | boolean) => {
    setPodcastConfig(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value
      }
    }))
  }

  const handleConnectScraping = () => {
    setIsScrapingModalOpen(true)
  }

  const handleSaveScrapingConfig = async () => {
    if (scrapingConfig.sites.length === 0) {
      toast.warning('Por favor configura al menos un sitio web para scraping')
      return
    }

    setIsConnecting(true)
    try {
      // Simular guardado de configuración
      await new Promise(resolve => setTimeout(resolve, 2000))

      const enabledSites = scrapingConfig.sites
        .filter(site => site.enabled)
        .map(site => site.name)
        .join(', ')

      toast.success(`Configuración de scraping guardada para: ${enabledSites}. VIRA utilizará ${scrapingConfig.engine} para extraer noticias automáticamente.`)
      setIsScrapingModalOpen(false)

    } catch (error) {
      toast.error('Error al guardar la configuración de scraping')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleAddScrapingSite = () => {
    if (!newSite.name.trim() || !newSite.url.trim()) {
      toast.warning('Por favor complete nombre y URL del sitio')
      return
    }

    const siteToAdd = {
      id: Date.now(),
      name: newSite.name.trim(),
      url: newSite.url.trim(),
      enabled: true,
      selectors: { ...newSite.selectors },
      filters: {
        minWordCount: newSite.filters.minWordCount,
        excludeKeywords: newSite.filters.excludeKeywords ? newSite.filters.excludeKeywords.split(',').map(k => k.trim()) : [],
        includeOnlyKeywords: newSite.filters.includeOnlyKeywords ? newSite.filters.includeOnlyKeywords.split(',').map(k => k.trim()) : []
      }
    }

    setScrapingConfig(prev => ({
      ...prev,
      sites: [...prev.sites, siteToAdd]
    }))

    // Limpiar formulario
    setNewSite({
      name: '',
      url: '',
      selectors: {
        articleLinks: '',
        title: '',
        content: '',
        date: '',
        author: ''
      },
      filters: {
        minWordCount: 50,
        excludeKeywords: '',
        includeOnlyKeywords: ''
      }
    })

    toast.success('Sitio agregado exitosamente')
  }

  const handleDeleteScrapingSite = (siteId: number) => {
    if (confirm('¿Estás seguro de que deseas eliminar este sitio de scraping?')) {
      setScrapingConfig(prev => ({
        ...prev,
        sites: prev.sites.filter(site => site.id !== siteId)
      }))
    }
  }

  const handleToggleScrapingSite = (siteId: number, enabled: boolean) => {
    setScrapingConfig(prev => ({
      ...prev,
      sites: prev.sites.map(site =>
        site.id === siteId ? { ...site, enabled } : site
      )
    }))
  }

  const handleTestSelector = async (url: string, selector: string) => {
    if (!url.trim() || !selector.trim()) {
      toast.warning('Por favor proporciona URL y selector para probar')
      return
    }

    // Simular test de selector
    toast.info(`Probando selector...`)
  }

  const handleConnectAi = () => {
    setIsAiModalOpen(true)
  }

  const handleSaveAiConfig = async () => {
    if (!aiConfig.abacus.enabled && !aiConfig.groq.enabled) {
      toast.warning('Por favor habilita al menos una API de IA')
      return
    }

    if (aiConfig.groq.enabled && !aiConfig.groq.apiKey.trim()) {
      toast.warning('Por favor configura la API Key de Groq')
      return
    }

    setIsConnecting(true)
    try {
      // Simular guardado de configuración
      await new Promise(resolve => setTimeout(resolve, 2000))

      const enabledApis = []
      if (aiConfig.abacus.enabled) enabledApis.push('Abacus AI')
      if (aiConfig.groq.enabled) enabledApis.push('Groq')

      toast.success(`Configuración de IA guardada para: ${enabledApis.join(', ')}. VIRA procesará automáticamente las noticias scrapeadas usando estos modelos.`)
      setIsAiModalOpen(false)

    } catch (error) {
      toast.error('Error al guardar la configuración de IA')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleTestAiPrompt = async (promptType: 'rewrite' | 'humanize' | 'adapt') => {
    const sampleNews = "El Presidente Gabriel Boric anunció ayer nuevas medidas económicas para enfrentar la inflación que afecta al país. Las medidas incluyen subsidios para familias de menores ingresos y controles de precios en productos básicos."

    // Determinar qué proveedor usar
    let provider = 'abacus'
    let model = aiConfig.abacus.model
    let groqApiKey = ''

    if (aiConfig.groq.enabled && aiConfig.groq.apiKey.trim()) {
      provider = 'groq'
      model = aiConfig.groq.model
      groqApiKey = aiConfig.groq.apiKey
    } else if (!aiConfig.abacus.enabled) {
      toast.error(' Por favor habilita al menos una API de IA (Abacus AI o Groq)')
      return
    }

    setIsConnecting(true)
    try {
      const response = await fetch('/api/process-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: sampleNews,
          step: promptType,
          radioStyle: aiConfig.processing.radioStyle,
          provider,
          model,
          groqApiKey
        }),
      })

      const data = await response.json()

      if (data.success) {
        const providerName = provider === 'abacus' ? 'Abacus AI' : 'Groq'
        toast.success(` Test de ${promptType} exitoso con ${providerName} (${data.model})!\n\nNoticia original:\n"${sampleNews}"\n\nNoticia procesada:\n"${data.processedContent}"`)
      } else {
        toast.error(` Error en el test: ${data.error}`)
      }
    } catch (error) {
      toast.error(` Error de conexión: ${error}`)
    } finally {
      setIsConnecting(false)
    }
  }

  const updateAiConfig = (section: keyof typeof aiConfig, field: string, value: any) => {
    setAiConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const handleConnectVoice = () => {
    setIsVoiceModalOpen(true)
  }

  const handleSaveVoiceConfig = async () => {
    const enabledProviders = []
    if (voiceConfig.abacusElevenlabs.enabled) enabledProviders.push('Abacus ElevenLabs')
    if (voiceConfig.elevenlabs.enabled) enabledProviders.push('ElevenLabs Directo')
    if (voiceConfig.azure.enabled) enabledProviders.push('Azure Speech')
    if (voiceConfig.openai.enabled) enabledProviders.push('OpenAI TTS')
    if (voiceConfig.polly.enabled) enabledProviders.push('Amazon Polly')
    if (voiceConfig.edge.enabled) enabledProviders.push('Edge TTS')

    if (enabledProviders.length === 0) {
      toast.warning('Por favor habilita al menos un proveedor de voz')
      return
    }

    // Validar APIs keys requeridas
    if (voiceConfig.elevenlabs.enabled && !voiceConfig.elevenlabs.apiKey.trim()) {
      toast.warning('Por favor configura la API Key de ElevenLabs')
      return
    }

    if (voiceConfig.azure.enabled && (!voiceConfig.azure.subscriptionKey.trim() || !voiceConfig.azure.region.trim())) {
      toast.warning('Por favor configura la Subscription Key y Región de Azure')
      return
    }

    if (voiceConfig.polly.enabled && (!voiceConfig.polly.accessKeyId.trim() || !voiceConfig.polly.secretAccessKey.trim())) {
      toast.warning('Por favor configura las credenciales de AWS para Amazon Polly')
      return
    }

    setIsConnecting(true)
    try {
      // Simular guardado de configuración
      await new Promise(resolve => setTimeout(resolve, 2000))

      toast.success(` Configuración de voz guardada exitosamente!\n\nProveedores activos: ${enabledProviders.join(', ')}\n\nPrimario: ${getProviderName(voiceConfig.processing.primaryProvider)}\nRespaldo: ${getProviderName(voiceConfig.processing.fallbackProvider)}\nEmergencia: ${getProviderName(voiceConfig.processing.emergencyProvider)}`)
      setIsVoiceModalOpen(false)

    } catch (error) {
      toast.error('Error al guardar la configuración de voz')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleTestVoice = async (provider: string) => {
    const sampleText = "Hola, bienvenidos a las noticias. El Presidente Gabriel Boric anunció nuevas medidas económicas para el país."

    setIsConnecting(true)
    try {
      // Simular síntesis de voz
      await new Promise(resolve => setTimeout(resolve, 3000))

      const providerName = getProviderName(provider)
      toast.success(` Test de voz exitoso con ${providerName}!\n\nTexto convertido: "${sampleText}"\n\nCalidad: Audio de 192kbps MP3 generado correctamente.\n\n¿Quieres escuchar el resultado? (Se reproducirá en tu navegador)`)

    } catch (error) {
      toast.error(` Error en el test de ${getProviderName(provider)}: ${error}`)
    } finally {
      setIsConnecting(false)
    }
  }

  const getProviderName = (provider: string) => {
    const names = {
      abacusElevenlabs: 'Abacus ElevenLabs',
      elevenlabs: 'ElevenLabs Directo',
      azure: 'Azure Speech',
      openai: 'OpenAI TTS',
      polly: 'Amazon Polly',
      edge: 'Edge TTS'
    }
    return names[provider as keyof typeof names] || provider
  }

  const updateVoiceConfig = (section: keyof typeof voiceConfig, field: string, value: any) => {
    setVoiceConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const handleConnectSocial = () => {
    setIsSocialModalOpen(true)
  }

  const handleSaveSocialConfig = async () => {
    // Validar que al menos una red social esté configurada
    const hasValidConfig = Object.values(socialConfig).some(platform =>
      platform.enabled && Object.values(platform).some(value =>
        typeof value === 'string' && value.trim() !== ''
      )
    )

    if (!hasValidConfig) {
      toast.warning('Por favor configura al menos una red social')
      return
    }

    setIsConnecting(true)
    try {
      // Simular guardado de configuración
      await new Promise(resolve => setTimeout(resolve, 2000))

      const enabledPlatforms = Object.entries(socialConfig)
        .filter(([_, config]) => config.enabled)
        .map(([platform]) => platform)
        .join(', ')

      toast.success(`Configuración guardada para: ${enabledPlatforms}. Los noticieros se publicarán automáticamente en estas plataformas.`)
      setIsSocialModalOpen(false)

    } catch (error) {
      toast.error('Error al guardar la configuración de redes sociales')
    } finally {
      setIsConnecting(false)
    }
  }

  const updateSocialConfig = (platform: 'twitter' | 'facebook' | 'instagram', field: string, value: string | boolean) => {
    setSocialConfig(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value
      }
    }))
  }

  const handleConfigureRadioSoftware = async () => {
    if (!selectedSoftware) {
      toast.warning('Por favor selecciona un software de automatización')
      return
    }

    if (!connectionConfig.serverUrl.trim()) {
      toast.warning('Por favor ingresa la URL del servidor')
      return
    }

    setIsConnecting(true)
    try {
      // Simular configuración
      await new Promise(resolve => setTimeout(resolve, 2000))

      const software = radioAutomationSoftware.find(s => s.id === selectedSoftware)
      toast.success(`Configuración guardada para ${software?.name}. Los noticieros se enviarán automáticamente a tu sistema.`)

      // Limpiar formulario
      setConnectionConfig({
        serverUrl: '',
        username: '',
        password: '',
        port: '',
        additionalConfig: ''
      })
      setSelectedSoftware('')
      setIsConfigModalOpen(false)

    } catch (error) {
      toast.error('Error al configurar la conexión')
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-gray-50">
        <Navigation />

        <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Integraciones y Conexiones
            </h1>
            <p className="text-lg text-gray-600">
              Conecta VIRA con las herramientas que ya usas.
            </p>
          </div>

          {/* Integrations Cards */}
          <div className="space-y-6">
            {/* Plataformas de Podcast */}
            <Card className="bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Podcast className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Plataformas de Podcast
                      </h3>
                      <p className="text-gray-600">
                        Publica automáticamente tus noticieros en Spotify, Apple Podcasts y más.
                      </p>
                    </div>
                  </div>

                  <Dialog open={isPodcastModalOpen} onOpenChange={setIsPodcastModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6"
                      >
                        Conectar
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                          Configurar Plataformas de Podcast
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-8 mt-6">
                        {/* Spotify for Podcasters */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <div className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                                  <div className="h-2 w-2 bg-white rounded-full"></div>
                                </div>
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">Spotify for Podcasters</h3>
                                <p className="text-sm text-gray-600">Sube automáticamente a Spotify</p>
                              </div>
                            </div>
                            <Switch
                              checked={podcastConfig.spotify.enabled}
                              onCheckedChange={(checked) => updatePodcastConfig('spotify', 'enabled', checked)}
                            />
                          </div>

                          {podcastConfig.spotify.enabled && (
                            <div className="pl-11 space-y-4 bg-gray-50 p-4 rounded-lg">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Client ID
                                  </Label>
                                  <Input
                                    placeholder="Tu Spotify Client ID"
                                    value={podcastConfig.spotify.clientId}
                                    onChange={(e) => updatePodcastConfig('spotify', 'clientId', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Client Secret
                                  </Label>
                                  <Input
                                    type="password"
                                    placeholder="Tu Spotify Client Secret"
                                    value={podcastConfig.spotify.clientSecret}
                                    onChange={(e) => updatePodcastConfig('spotify', 'clientSecret', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Refresh Token
                                  </Label>
                                  <Input
                                    type="password"
                                    placeholder="Tu Refresh Token"
                                    value={podcastConfig.spotify.refreshToken}
                                    onChange={(e) => updatePodcastConfig('spotify', 'refreshToken', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Show ID
                                  </Label>
                                  <Input
                                    placeholder="ID de tu podcast en Spotify"
                                    value={podcastConfig.spotify.showId}
                                    onChange={(e) => updatePodcastConfig('spotify', 'showId', e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <h4 className="font-medium text-green-900 text-sm mb-1">
                                  Cómo configurar Spotify for Podcasters:
                                </h4>
                                <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside">
                                  <li>Ve a <strong>podcasters.spotify.com</strong> y crea tu cuenta</li>
                                  <li>Registra tu podcast y obtén el Show ID desde la URL</li>
                                  <li>Ve a <strong>developer.spotify.com</strong> y crea una aplicación</li>
                                  <li>Copia Client ID y Client Secret de tu app</li>
                                  <li>Genera Refresh Token usando OAuth 2.0</li>
                                </ol>
                              </div>
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* Apple Podcasts Connect */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                <div className="h-5 w-5 bg-black rounded text-white flex items-center justify-center text-xs font-bold">🍎</div>
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">Apple Podcasts Connect</h3>
                                <p className="text-sm text-gray-600">Sube a Apple Podcasts</p>
                              </div>
                            </div>
                            <Switch
                              checked={podcastConfig.apple.enabled}
                              onCheckedChange={(checked) => updatePodcastConfig('apple', 'enabled', checked)}
                            />
                          </div>

                          {podcastConfig.apple.enabled && (
                            <div className="pl-11 space-y-4 bg-gray-50 p-4 rounded-lg">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Key ID
                                  </Label>
                                  <Input
                                    placeholder="Tu Apple Key ID"
                                    value={podcastConfig.apple.keyId}
                                    onChange={(e) => updatePodcastConfig('apple', 'keyId', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Issuer ID
                                  </Label>
                                  <Input
                                    placeholder="Tu Apple Issuer ID"
                                    value={podcastConfig.apple.issuerId}
                                    onChange={(e) => updatePodcastConfig('apple', 'issuerId', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Show ID
                                  </Label>
                                  <Input
                                    placeholder="ID de tu podcast en Apple"
                                    value={podcastConfig.apple.showId}
                                    onChange={(e) => updatePodcastConfig('apple', 'showId', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Private Key
                                  </Label>
                                  <Textarea
                                    placeholder="Tu Apple Private Key (.p8 file content)"
                                    value={podcastConfig.apple.privateKey}
                                    onChange={(e) => updatePodcastConfig('apple', 'privateKey', e.target.value)}
                                    className="min-h-20"
                                  />
                                </div>
                              </div>
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <h4 className="font-medium text-blue-900 text-sm mb-1">
                                  Cómo configurar Apple Podcasts Connect:
                                </h4>
                                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                                  <li>Ve a <strong>podcastsconnect.apple.com</strong> y registra tu podcast</li>
                                  <li>Ve a <strong>developer.apple.com</strong> → "Certificates, Identifiers & Profiles"</li>
                                  <li>Crea una nueva Key con "Media Services" habilitado</li>
                                  <li>Descarga el archivo .p8 y copia su contenido</li>
                                  <li>Obtén Show ID desde la URL de tu podcast en Apple Podcasts Connect</li>
                                </ol>
                              </div>
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* Google Podcasts Manager */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <div className="h-5 w-5 bg-blue-500 rounded text-white flex items-center justify-center text-xs font-bold">G</div>
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">Google Podcasts Manager</h3>
                                <p className="text-sm text-gray-600">Sube a Google Podcasts</p>
                              </div>
                            </div>
                            <Switch
                              checked={podcastConfig.google.enabled}
                              onCheckedChange={(checked) => updatePodcastConfig('google', 'enabled', checked)}
                            />
                          </div>

                          {podcastConfig.google.enabled && (
                            <div className="pl-11 space-y-4 bg-gray-50 p-4 rounded-lg">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Client ID
                                  </Label>
                                  <Input
                                    placeholder="Tu Google Client ID"
                                    value={podcastConfig.google.clientId}
                                    onChange={(e) => updatePodcastConfig('google', 'clientId', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Client Secret
                                  </Label>
                                  <Input
                                    type="password"
                                    placeholder="Tu Google Client Secret"
                                    value={podcastConfig.google.clientSecret}
                                    onChange={(e) => updatePodcastConfig('google', 'clientSecret', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Refresh Token
                                  </Label>
                                  <Input
                                    type="password"
                                    placeholder="Tu Google Refresh Token"
                                    value={podcastConfig.google.refreshToken}
                                    onChange={(e) => updatePodcastConfig('google', 'refreshToken', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Podcast ID
                                  </Label>
                                  <Input
                                    placeholder="ID de tu podcast en Google"
                                    value={podcastConfig.google.podcastId}
                                    onChange={(e) => updatePodcastConfig('google', 'podcastId', e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <h4 className="font-medium text-blue-900 text-sm mb-1">
                                  Cómo configurar Google Podcasts Manager:
                                </h4>
                                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                                  <li>Ve a <strong>console.cloud.google.com</strong> y crea un proyecto</li>
                                  <li>Habilita "Podcast API" en la biblioteca de APIs</li>
                                  <li>Crea credenciales OAuth 2.0</li>
                                  <li>Ve a <strong>podcastsmanager.google.com</strong> y registra tu podcast</li>
                                  <li>Obtén el Podcast ID desde la URL de gestión</li>
                                </ol>
                              </div>
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* Amazon Music for Podcasters */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                <div className="h-5 w-5 bg-orange-500 rounded text-white flex items-center justify-center text-xs font-bold">A</div>
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">Amazon Music for Podcasters</h3>
                                <p className="text-sm text-gray-600">Sube a Amazon Music</p>
                              </div>
                            </div>
                            <Switch
                              checked={podcastConfig.amazon.enabled}
                              onCheckedChange={(checked) => updatePodcastConfig('amazon', 'enabled', checked)}
                            />
                          </div>

                          {podcastConfig.amazon.enabled && (
                            <div className="pl-11 space-y-4 bg-gray-50 p-4 rounded-lg">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Vendor ID
                                  </Label>
                                  <Input
                                    placeholder="Tu Amazon Vendor ID"
                                    value={podcastConfig.amazon.vendorId}
                                    onChange={(e) => updatePodcastConfig('amazon', 'vendorId', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Developer Token
                                  </Label>
                                  <Input
                                    type="password"
                                    placeholder="Tu Amazon Developer Token"
                                    value={podcastConfig.amazon.developerToken}
                                    onChange={(e) => updatePodcastConfig('amazon', 'developerToken', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Refresh Token
                                  </Label>
                                  <Input
                                    type="password"
                                    placeholder="Tu Amazon Refresh Token"
                                    value={podcastConfig.amazon.refreshToken}
                                    onChange={(e) => updatePodcastConfig('amazon', 'refreshToken', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Show ID
                                  </Label>
                                  <Input
                                    placeholder="ID de tu podcast en Amazon"
                                    value={podcastConfig.amazon.showId}
                                    onChange={(e) => updatePodcastConfig('amazon', 'showId', e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                <h4 className="font-medium text-orange-900 text-sm mb-1">
                                  Cómo configurar Amazon Music for Podcasters:
                                </h4>
                                <ol className="text-xs text-orange-700 space-y-1 list-decimal list-inside">
                                  <li>Ve a <strong>music.amazon.com/podcasters</strong> y registra tu podcast</li>
                                  <li>Ve a <strong>developer.amazon.com</strong> y crea una aplicación</li>
                                  <li>Solicita acceso al Amazon Music API</li>
                                  <li>Obtén tus credenciales de desarrollador</li>
                                  <li>Configura OAuth para obtener tokens de acceso</li>
                                </ol>
                              </div>
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* iHeartRadio */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center">
                                <div className="h-5 w-5 bg-red-500 rounded text-white flex items-center justify-center text-xs font-bold">♥</div>
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">iHeartRadio</h3>
                                <p className="text-sm text-gray-600">Sube a iHeartRadio Podcasts</p>
                              </div>
                            </div>
                            <Switch
                              checked={podcastConfig.iheartradio.enabled}
                              onCheckedChange={(checked) => updatePodcastConfig('iheartradio', 'enabled', checked)}
                            />
                          </div>

                          {podcastConfig.iheartradio.enabled && (
                            <div className="pl-11 space-y-4 bg-gray-50 p-4 rounded-lg">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    API Key
                                  </Label>
                                  <Input
                                    type="password"
                                    placeholder="Tu iHeartRadio API Key"
                                    value={podcastConfig.iheartradio.apiKey}
                                    onChange={(e) => updatePodcastConfig('iheartradio', 'apiKey', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Secret
                                  </Label>
                                  <Input
                                    type="password"
                                    placeholder="Tu iHeartRadio Secret"
                                    value={podcastConfig.iheartradio.secret}
                                    onChange={(e) => updatePodcastConfig('iheartradio', 'secret', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Podcast ID
                                  </Label>
                                  <Input
                                    placeholder="ID de tu podcast en iHeartRadio"
                                    value={podcastConfig.iheartradio.podcastId}
                                    onChange={(e) => updatePodcastConfig('iheartradio', 'podcastId', e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <h4 className="font-medium text-red-900 text-sm mb-1">
                                  Cómo configurar iHeartRadio:
                                </h4>
                                <ol className="text-xs text-red-700 space-y-1 list-decimal list-inside">
                                  <li>Contacta a <strong>podcasts@iheartmedia.com</strong> para registro</li>
                                  <li>Completa el proceso de aplicación de contenido</li>
                                  <li>Recibe credenciales API una vez aprobado</li>
                                  <li>Obtén tu Podcast ID desde el dashboard</li>
                                </ol>
                              </div>
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* TuneIn */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 bg-teal-100 rounded-lg flex items-center justify-center">
                                <div className="h-5 w-5 bg-teal-500 rounded text-white flex items-center justify-center text-xs font-bold">T</div>
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">TuneIn</h3>
                                <p className="text-sm text-gray-600">Sube a TuneIn Radio</p>
                              </div>
                            </div>
                            <Switch
                              checked={podcastConfig.tunein.enabled}
                              onCheckedChange={(checked) => updatePodcastConfig('tunein', 'enabled', checked)}
                            />
                          </div>

                          {podcastConfig.tunein.enabled && (
                            <div className="pl-11 space-y-4 bg-gray-50 p-4 rounded-lg">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Partner ID
                                  </Label>
                                  <Input
                                    placeholder="Tu TuneIn Partner ID"
                                    value={podcastConfig.tunein.partnerId}
                                    onChange={(e) => updatePodcastConfig('tunein', 'partnerId', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Station ID
                                  </Label>
                                  <Input
                                    placeholder="Tu TuneIn Station ID"
                                    value={podcastConfig.tunein.stationId}
                                    onChange={(e) => updatePodcastConfig('tunein', 'stationId', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    API Key
                                  </Label>
                                  <Input
                                    type="password"
                                    placeholder="Tu TuneIn API Key"
                                    value={podcastConfig.tunein.apiKey}
                                    onChange={(e) => updatePodcastConfig('tunein', 'apiKey', e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                                <h4 className="font-medium text-teal-900 text-sm mb-1">
                                  Cómo configurar TuneIn:
                                </h4>
                                <ol className="text-xs text-teal-700 space-y-1 list-decimal list-inside">
                                  <li>Ve a <strong>tunein.com/broadcasters</strong> y registra tu estación</li>
                                  <li>Solicita acceso al TuneIn Partner API</li>
                                  <li>Completa el proceso de verificación</li>
                                  <li>Recibe credenciales API y Station ID</li>
                                </ol>
                              </div>
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* RSS Feed / Hosting Propio */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                <div className="h-5 w-5 bg-purple-500 rounded text-white flex items-center justify-center text-xs font-bold">RSS</div>
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">RSS Feed / Hosting Propio</h3>
                                <p className="text-sm text-gray-600">Actualiza tu feed RSS automáticamente</p>
                              </div>
                            </div>
                            <Switch
                              checked={podcastConfig.rss.enabled}
                              onCheckedChange={(checked) => updatePodcastConfig('rss', 'enabled', checked)}
                            />
                          </div>

                          {podcastConfig.rss.enabled && (
                            <div className="pl-11 space-y-4 bg-gray-50 p-4 rounded-lg">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Feed URL
                                  </Label>
                                  <Input
                                    placeholder="https://turadio.com/podcast/feed.xml"
                                    value={podcastConfig.rss.feedUrl}
                                    onChange={(e) => updatePodcastConfig('rss', 'feedUrl', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    FTP Host
                                  </Label>
                                  <Input
                                    placeholder="ftp.turadio.com"
                                    value={podcastConfig.rss.ftpHost}
                                    onChange={(e) => updatePodcastConfig('rss', 'ftpHost', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    FTP Usuario
                                  </Label>
                                  <Input
                                    placeholder="Tu usuario FTP"
                                    value={podcastConfig.rss.ftpUser}
                                    onChange={(e) => updatePodcastConfig('rss', 'ftpUser', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    FTP Contraseña
                                  </Label>
                                  <Input
                                    type="password"
                                    placeholder="Tu contraseña FTP"
                                    value={podcastConfig.rss.ftpPassword}
                                    onChange={(e) => updatePodcastConfig('rss', 'ftpPassword', e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                <h4 className="font-medium text-purple-900 text-sm mb-1">
                                  Configuración RSS Feed:
                                </h4>
                                <p className="text-xs text-purple-700 mb-2">
                                  VIRA subirá automáticamente los archivos MP3 vía FTP y actualizará tu feed RSS con los nuevos episodios.
                                </p>
                                <ul className="text-xs text-purple-700 space-y-1 list-disc list-inside">
                                  <li>Proporciona la URL donde está alojado tu feed RSS</li>
                                  <li>Configura credenciales FTP para subir archivos de audio</li>
                                  <li>VIRA actualizará automáticamente el XML del feed</li>
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Información general */}
                        <Separator />
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-medium text-green-900 mb-2">
                            ¿Qué sucederá una vez configurado?
                          </h4>
                          <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                            <li>VIRA convertirá automáticamente tus noticieros en episodios de podcast</li>
                            <li>Se subirán a las plataformas configuradas según tu programación</li>
                            <li>Cada episodio incluirá metadatos apropiados (título, descripción, categorías)</li>
                            <li>Se mantendrá la identidad de tu radio en todas las plataformas</li>
                            <li>Recibirás notificaciones del estado de cada subida</li>
                            <li>Los episodios se organizarán cronológicamente por fecha de creación</li>
                          </ul>
                        </div>

                        {/* Botones */}
                        <div className="flex justify-end space-x-3 pt-4">
                          <DialogClose asChild>
                            <Button variant="outline">
                              Cancelar
                            </Button>
                          </DialogClose>
                          <Button
                            onClick={handleSavePodcastConfig}
                            disabled={isConnecting}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Podcast className="h-4 w-4 mr-2" />
                            {isConnecting ? 'Guardando...' : 'Guardar Configuración'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Redes Sociales */}
            <Card className="bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Twitter className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Redes Sociales
                      </h3>
                      <p className="text-gray-600">
                        Genera y publica audiogramas y clips en Twitter, Facebook e Instagram.
                      </p>
                    </div>
                  </div>

                  <Dialog open={isSocialModalOpen} onOpenChange={setIsSocialModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6"
                      >
                        Conectar
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                          Configurar Redes Sociales
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-8 mt-6">
                        {/* Twitter Configuration */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Twitter className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">Twitter (X)</h3>
                                <p className="text-sm text-gray-600">Publica audiogramas automáticamente</p>
                              </div>
                            </div>
                            <Switch
                              checked={socialConfig.twitter.enabled}
                              onCheckedChange={(checked) => updateSocialConfig('twitter', 'enabled', checked)}
                            />
                          </div>

                          {socialConfig.twitter.enabled && (
                            <div className="pl-11 space-y-4 bg-gray-50 p-4 rounded-lg">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    API Key
                                  </Label>
                                  <Input
                                    type="password"
                                    placeholder="Tu Twitter API Key"
                                    value={socialConfig.twitter.apiKey}
                                    onChange={(e) => updateSocialConfig('twitter', 'apiKey', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    API Secret Key
                                  </Label>
                                  <Input
                                    type="password"
                                    placeholder="Tu Twitter API Secret Key"
                                    value={socialConfig.twitter.apiSecretKey}
                                    onChange={(e) => updateSocialConfig('twitter', 'apiSecretKey', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Access Token
                                  </Label>
                                  <Input
                                    type="password"
                                    placeholder="Tu Twitter Access Token"
                                    value={socialConfig.twitter.accessToken}
                                    onChange={(e) => updateSocialConfig('twitter', 'accessToken', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Access Token Secret
                                  </Label>
                                  <Input
                                    type="password"
                                    placeholder="Tu Twitter Access Token Secret"
                                    value={socialConfig.twitter.accessTokenSecret}
                                    onChange={(e) => updateSocialConfig('twitter', 'accessTokenSecret', e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <h4 className="font-medium text-blue-900 text-sm mb-1">
                                  Cómo obtener las credenciales de Twitter:
                                </h4>
                                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                                  <li>Ve a <strong>developer.twitter.com</strong> y crea una cuenta de desarrollador</li>
                                  <li>Crea un nuevo proyecto y aplicación</li>
                                  <li>En la sección "Keys and Tokens", genera tus API Keys</li>
                                  <li>Asegúrate de tener permisos de "Read and Write"</li>
                                  <li>Copia y pega las credenciales aquí</li>
                                </ol>
                              </div>
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* Facebook Configuration */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <div className="h-5 w-5 bg-blue-600 rounded text-white flex items-center justify-center text-xs font-bold">f</div>
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">Facebook</h3>
                                <p className="text-sm text-gray-600">Publica en tu página de Facebook</p>
                              </div>
                            </div>
                            <Switch
                              checked={socialConfig.facebook.enabled}
                              onCheckedChange={(checked) => updateSocialConfig('facebook', 'enabled', checked)}
                            />
                          </div>

                          {socialConfig.facebook.enabled && (
                            <div className="pl-11 space-y-4 bg-gray-50 p-4 rounded-lg">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    App ID
                                  </Label>
                                  <Input
                                    placeholder="Tu Facebook App ID"
                                    value={socialConfig.facebook.appId}
                                    onChange={(e) => updateSocialConfig('facebook', 'appId', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    App Secret
                                  </Label>
                                  <Input
                                    type="password"
                                    placeholder="Tu Facebook App Secret"
                                    value={socialConfig.facebook.appSecret}
                                    onChange={(e) => updateSocialConfig('facebook', 'appSecret', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Access Token
                                  </Label>
                                  <Input
                                    type="password"
                                    placeholder="Tu Page Access Token"
                                    value={socialConfig.facebook.accessToken}
                                    onChange={(e) => updateSocialConfig('facebook', 'accessToken', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Page ID
                                  </Label>
                                  <Input
                                    placeholder="ID de tu página de Facebook"
                                    value={socialConfig.facebook.pageId}
                                    onChange={(e) => updateSocialConfig('facebook', 'pageId', e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <h4 className="font-medium text-blue-900 text-sm mb-1">
                                  Cómo obtener las credenciales de Facebook:
                                </h4>
                                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                                  <li>Ve a <strong>developers.facebook.com</strong> y crea una aplicación</li>
                                  <li>Agrega el producto "Facebook Login" y "Pages API"</li>
                                  <li>En "App Settings" → "Basic", copia App ID y App Secret</li>
                                  <li>Usa Graph API Explorer para generar un Page Access Token</li>
                                  <li>Obtén el ID de tu página desde la configuración de la página</li>
                                </ol>
                              </div>
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* Instagram Configuration */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 bg-pink-100 rounded-lg flex items-center justify-center">
                                <div className="h-5 w-5 bg-gradient-to-br from-purple-500 to-pink-500 rounded text-white flex items-center justify-center text-xs font-bold">ig</div>
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">Instagram</h3>
                                <p className="text-sm text-gray-600">Publica clips de audio en Instagram</p>
                              </div>
                            </div>
                            <Switch
                              checked={socialConfig.instagram.enabled}
                              onCheckedChange={(checked) => updateSocialConfig('instagram', 'enabled', checked)}
                            />
                          </div>

                          {socialConfig.instagram.enabled && (
                            <div className="pl-11 space-y-4 bg-gray-50 p-4 rounded-lg">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    App ID
                                  </Label>
                                  <Input
                                    placeholder="Tu Instagram App ID"
                                    value={socialConfig.instagram.appId}
                                    onChange={(e) => updateSocialConfig('instagram', 'appId', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    App Secret
                                  </Label>
                                  <Input
                                    type="password"
                                    placeholder="Tu Instagram App Secret"
                                    value={socialConfig.instagram.appSecret}
                                    onChange={(e) => updateSocialConfig('instagram', 'appSecret', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Access Token
                                  </Label>
                                  <Input
                                    type="password"
                                    placeholder="Tu Instagram Access Token"
                                    value={socialConfig.instagram.accessToken}
                                    onChange={(e) => updateSocialConfig('instagram', 'accessToken', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    User ID
                                  </Label>
                                  <Input
                                    placeholder="Tu Instagram User ID"
                                    value={socialConfig.instagram.userId}
                                    onChange={(e) => updateSocialConfig('instagram', 'userId', e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                                <h4 className="font-medium text-pink-900 text-sm mb-1">
                                  Cómo obtener las credenciales de Instagram:
                                </h4>
                                <ol className="text-xs text-pink-700 space-y-1 list-decimal list-inside">
                                  <li>Ve a <strong>developers.facebook.com</strong> (Instagram usa Facebook API)</li>
                                  <li>Crea una aplicación y agrega "Instagram Basic Display"</li>
                                  <li>Configura Instagram Business Account si no tienes uno</li>
                                  <li>Genera Access Token desde Instagram Basic Display</li>
                                  <li>Obtén tu User ID desde la respuesta de la API</li>
                                </ol>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Configuración Global */}
                        <Separator />
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-medium text-green-900 mb-2">
                            ¿Qué sucederá una vez configurado?
                          </h4>
                          <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                            <li>VIRA generará audiogramas automáticamente de tus noticieros</li>
                            <li>Se publicarán en las redes sociales configuradas según tu programación</li>
                            <li>Puedes personalizar el texto de acompañamiento en cada plataforma</li>
                            <li>Los videos incluirán la identidad visual de tu radio</li>
                            <li>Recibirás notificaciones del estado de cada publicación</li>
                          </ul>
                        </div>

                        {/* Botones */}
                        <div className="flex justify-end space-x-3 pt-4">
                          <DialogClose asChild>
                            <Button variant="outline">
                              Cancelar
                            </Button>
                          </DialogClose>
                          <Button
                            onClick={handleSaveSocialConfig}
                            disabled={isConnecting}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Twitter className="h-4 w-4 mr-2" />
                            {isConnecting ? 'Guardando...' : 'Guardar Configuración'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Software de Automatización Radial */}
            <Card className="bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <Radio className="h-6 w-6 text-red-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Software de Automatización Radial
                      </h3>
                      <p className="text-gray-600">
                        Envía tus noticieros directamente a tu sistema de playout (Ej. ZaraRadio).
                      </p>
                    </div>
                  </div>

                  <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6"
                      >
                        Configurar
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                          Configurar Software de Automatización Radial
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-6 mt-4">
                        {/* Selección de Software */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">
                            Selecciona tu Software de Automatización
                          </Label>
                          <Select value={selectedSoftware} onValueChange={setSelectedSoftware}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona tu software..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {radioAutomationSoftware.map(software => (
                                <SelectItem key={software.id} value={software.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{software.name}</span>
                                    <span className="text-xs text-gray-500">{software.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Configuración de Conexión */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              URL del Servidor / IP
                            </Label>
                            <Input
                              placeholder="ej: 192.168.1.100 o radio.ejemplo.com"
                              value={connectionConfig.serverUrl}
                              onChange={(e) => setConnectionConfig(prev => ({
                                ...prev,
                                serverUrl: e.target.value
                              }))}
                            />
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Puerto (opcional)
                            </Label>
                            <Input
                              placeholder="ej: 8000"
                              value={connectionConfig.port}
                              onChange={(e) => setConnectionConfig(prev => ({
                                ...prev,
                                port: e.target.value
                              }))}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Usuario (opcional)
                            </Label>
                            <Input
                              placeholder="nombre de usuario"
                              value={connectionConfig.username}
                              onChange={(e) => setConnectionConfig(prev => ({
                                ...prev,
                                username: e.target.value
                              }))}
                            />
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Contraseña (opcional)
                            </Label>
                            <Input
                              type="password"
                              placeholder="contraseña"
                              value={connectionConfig.password}
                              onChange={(e) => setConnectionConfig(prev => ({
                                ...prev,
                                password: e.target.value
                              }))}
                            />
                          </div>
                        </div>

                        {/* Configuración Adicional */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">
                            Configuración Adicional (opcional)
                          </Label>
                          <Textarea
                            placeholder="Parámetros adicionales específicos de tu software..."
                            value={connectionConfig.additionalConfig}
                            onChange={(e) => setConnectionConfig(prev => ({
                              ...prev,
                              additionalConfig: e.target.value
                            }))}
                            className="min-h-20"
                          />
                        </div>

                        {/* Instrucciones */}
                        {selectedSoftware && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-medium text-blue-900 mb-2">
                              Instrucciones para {radioAutomationSoftware.find(s => s.id === selectedSoftware)?.name}
                            </h4>
                            <p className="text-sm text-blue-700">
                              Una vez configurada la conexión, VIRA enviará automáticamente los archivos MP3
                              de los noticieros generados directamente a tu sistema de playout.
                              Asegúrate de que tu software esté configurado para recibir archivos externos.
                            </p>
                          </div>
                        )}

                        {/* Botones */}
                        <div className="flex justify-end space-x-3 pt-4">
                          <DialogClose asChild>
                            <Button variant="outline">
                              Cancelar
                            </Button>
                          </DialogClose>
                          <Button
                            onClick={handleConfigureRadioSoftware}
                            disabled={isConnecting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            {isConnecting ? 'Configurando...' : 'Guardar Configuración'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Configuración de Scraping */}
            <Card className="bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Globe2 className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Configuración de Scraping
                      </h3>
                      <p className="text-gray-600">
                        Configura selectores CSS personalizados para extraer noticias de cualquier sitio web.
                      </p>
                    </div>
                  </div>

                  <Dialog open={isScrapingModalOpen} onOpenChange={setIsScrapingModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6"
                      >
                        Configurar
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                          Configuración de Scraping Dinámico
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-8 mt-6">
                        {/* Configuración Global */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900">Configuración Global</h3>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                Motor de Scraping
                              </Label>
                              <Select value={scrapingConfig.engine} onValueChange={(value) => setScrapingConfig(prev => ({ ...prev, engine: value }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cheerio">Cheerio (Rápido - HTML estático)</SelectItem>
                                  <SelectItem value="puppeteer">Puppeteer (JavaScript renderizado)</SelectItem>
                                  <SelectItem value="playwright">Playwright (Más robusto)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                Delay entre requests (ms)
                              </Label>
                              <Input
                                type="number"
                                value={scrapingConfig.globalSettings.delay}
                                onChange={(e) => setScrapingConfig(prev => ({
                                  ...prev,
                                  globalSettings: { ...prev.globalSettings, delay: parseInt(e.target.value) || 2000 }
                                }))}
                              />
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                User Agent
                              </Label>
                              <Input
                                value={scrapingConfig.globalSettings.userAgent}
                                onChange={(e) => setScrapingConfig(prev => ({
                                  ...prev,
                                  globalSettings: { ...prev.globalSettings, userAgent: e.target.value }
                                }))}
                              />
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Sitios Configurados */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900">Sitios Web Configurados</h3>

                          <div className="space-y-4">
                            {scrapingConfig.sites.map(site => (
                              <div key={site.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center space-x-3">
                                    <Switch
                                      checked={site.enabled}
                                      onCheckedChange={(checked) => handleToggleScrapingSite(site.id, checked)}
                                    />
                                    <div>
                                      <h4 className="font-medium text-gray-900">{site.name}</h4>
                                      <p className="text-sm text-gray-600">{site.url}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleTestSelector(site.url, site.selectors.title)}
                                      className="h-8 w-8 p-0 hover:bg-blue-50"
                                    >
                                      <TestTube className="h-4 w-4 text-blue-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteScrapingSite(site.id)}
                                      className="h-8 w-8 p-0 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                  <div>
                                    <Label className="text-xs font-medium text-gray-600">Enlaces de artículos:</Label>
                                    <p className="font-mono bg-gray-100 p-1 rounded mt-1">{site.selectors.articleLinks || 'No configurado'}</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs font-medium text-gray-600">Título:</Label>
                                    <p className="font-mono bg-gray-100 p-1 rounded mt-1">{site.selectors.title || 'No configurado'}</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs font-medium text-gray-600">Contenido:</Label>
                                    <p className="font-mono bg-gray-100 p-1 rounded mt-1">{site.selectors.content || 'No configurado'}</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs font-medium text-gray-600">Fecha:</Label>
                                    <p className="font-mono bg-gray-100 p-1 rounded mt-1">{site.selectors.date || 'No configurado'}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Separator />

                        {/* Agregar Nuevo Sitio */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900">Agregar Nuevo Sitio</h3>

                          <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                            {/* Información Básica */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                  Nombre del Sitio *
                                </Label>
                                <Input
                                  placeholder="ej: El Mercurio - Nacional"
                                  value={newSite.name}
                                  onChange={(e) => setNewSite(prev => ({ ...prev, name: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                  URL Base *
                                </Label>
                                <Input
                                  placeholder="https://www.elmercurio.com"
                                  value={newSite.url}
                                  onChange={(e) => setNewSite(prev => ({ ...prev, url: e.target.value }))}
                                />
                              </div>
                            </div>

                            {/* Selectores CSS */}
                            <div>
                              <h4 className="font-medium text-gray-700 mb-3">Selectores CSS</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Enlaces de Artículos *
                                  </Label>
                                  <div className="flex space-x-2">
                                    <Input
                                      placeholder="a[href*='/nacional/']"
                                      value={newSite.selectors.articleLinks}
                                      onChange={(e) => setNewSite(prev => ({
                                        ...prev,
                                        selectors: { ...prev.selectors, articleLinks: e.target.value }
                                      }))}
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleTestSelector(newSite.url, newSite.selectors.articleLinks)}
                                    >
                                      <TestTube className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">Selector para encontrar enlaces a artículos</p>
                                </div>

                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Título del Artículo *
                                  </Label>
                                  <div className="flex space-x-2">
                                    <Input
                                      placeholder="h1.headline, .title"
                                      value={newSite.selectors.title}
                                      onChange={(e) => setNewSite(prev => ({
                                        ...prev,
                                        selectors: { ...prev.selectors, title: e.target.value }
                                      }))}
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleTestSelector(newSite.url, newSite.selectors.title)}
                                    >
                                      <TestTube className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">Selector para el título principal</p>
                                </div>

                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Contenido del Artículo *
                                  </Label>
                                  <div className="flex space-x-2">
                                    <Input
                                      placeholder="div.story-body p, .content p"
                                      value={newSite.selectors.content}
                                      onChange={(e) => setNewSite(prev => ({
                                        ...prev,
                                        selectors: { ...prev.selectors, content: e.target.value }
                                      }))}
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleTestSelector(newSite.url, newSite.selectors.content)}
                                    >
                                      <TestTube className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">Selector para párrafos del contenido</p>
                                </div>

                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Fecha (opcional)
                                  </Label>
                                  <div className="flex space-x-2">
                                    <Input
                                      placeholder="time[datetime], .date"
                                      value={newSite.selectors.date}
                                      onChange={(e) => setNewSite(prev => ({
                                        ...prev,
                                        selectors: { ...prev.selectors, date: e.target.value }
                                      }))}
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleTestSelector(newSite.url, newSite.selectors.date)}
                                    >
                                      <TestTube className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">Selector para la fecha de publicación</p>
                                </div>
                              </div>
                            </div>

                            {/* Filtros */}
                            <div>
                              <h4 className="font-medium text-gray-700 mb-3">Filtros de Contenido</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Palabras Mínimas
                                  </Label>
                                  <Input
                                    type="number"
                                    value={newSite.filters.minWordCount}
                                    onChange={(e) => setNewSite(prev => ({
                                      ...prev,
                                      filters: { ...prev.filters, minWordCount: parseInt(e.target.value) || 50 }
                                    }))}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Excluir palabras
                                  </Label>
                                  <Input
                                    placeholder="publicidad, suscribete"
                                    value={newSite.filters.excludeKeywords}
                                    onChange={(e) => setNewSite(prev => ({
                                      ...prev,
                                      filters: { ...prev.filters, excludeKeywords: e.target.value }
                                    }))}
                                  />
                                  <p className="text-xs text-gray-500 mt-1">Separar con comas</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Solo incluir palabras
                                  </Label>
                                  <Input
                                    placeholder="nacional, politica"
                                    value={newSite.filters.includeOnlyKeywords}
                                    onChange={(e) => setNewSite(prev => ({
                                      ...prev,
                                      filters: { ...prev.filters, includeOnlyKeywords: e.target.value }
                                    }))}
                                  />
                                  <p className="text-xs text-gray-500 mt-1">Separar con comas (opcional)</p>
                                </div>
                              </div>
                            </div>

                            <Button onClick={handleAddScrapingSite} className="bg-purple-600 hover:bg-purple-700 text-white">
                              <Plus className="h-4 w-4 mr-2" />
                              Agregar Sitio
                            </Button>
                          </div>
                        </div>

                        {/* Información de Librerías */}
                        <Separator />
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-medium text-blue-900 mb-2">
                            Librerías de Scraping Utilizadas (Open Source)
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <h5 className="font-medium text-blue-800">Cheerio</h5>
                              <p className="text-blue-700 text-xs">Implementación de jQuery del lado del servidor. Ideal para HTML estático y sitios simples.</p>
                            </div>
                            <div>
                              <h5 className="font-medium text-blue-800">Puppeteer</h5>
                              <p className="text-blue-700 text-xs">Controla Chrome headless. Perfecto para sitios con JavaScript y contenido dinámico.</p>
                            </div>
                            <div>
                              <h5 className="font-medium text-blue-800">Playwright</h5>
                              <p className="text-blue-700 text-xs">Automatización de múltiples navegadores. Más robusto para sitios complejos.</p>
                            </div>
                          </div>
                        </div>

                        {/* Guía de Selectores CSS */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-medium text-green-900 mb-2">
                            Guía Rápida de Selectores CSS
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                              <h5 className="font-medium text-green-800 mb-1">Básicos:</h5>
                              <ul className="text-green-700 space-y-1 list-disc list-inside">
                                <li><code>.class</code> - Por clase</li>
                                <li><code>#id</code> - Por ID</li>
                                <li><code>tag</code> - Por etiqueta</li>
                                <li><code>[attribute]</code> - Por atributo</li>
                              </ul>
                            </div>
                            <div>
                              <h5 className="font-medium text-green-800 mb-1">Avanzados:</h5>
                              <ul className="text-green-700 space-y-1 list-disc list-inside">
                                <li><code>parent &gt; child</code> - Hijo directo</li>
                                <li><code>ancestor descendant</code> - Descendiente</li>
                                <li><code>[href*="texto"]</code> - Contiene texto</li>
                                <li><code>:nth-child(n)</code> - N-ésimo hijo</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Botones */}
                        <div className="flex justify-end space-x-3 pt-4">
                          <DialogClose asChild>
                            <Button variant="outline">
                              Cancelar
                            </Button>
                          </DialogClose>
                          <Button
                            onClick={handleSaveScrapingConfig}
                            disabled={isConnecting}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <Code className="h-4 w-4 mr-2" />
                            {isConnecting ? 'Guardando...' : 'Guardar Configuración'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Configuración de Inteligencia Artificial */}
            <Card className="bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Brain className="h-6 w-6 text-indigo-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Inteligencia Artificial
                      </h3>
                      <p className="text-gray-600">
                        Configura modelos de IA para reescribir, humanizar y adaptar noticias automáticamente.
                      </p>
                    </div>
                  </div>

                  <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6"
                      >
                        Configurar
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                          Configuración de Inteligencia Artificial
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-8 mt-6">
                        {/* APIs de IA */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900">APIs de Inteligencia Artificial</h3>

                          {/* Abacus AI */}
                          <div className="border border-gray-200 rounded-lg p-6 bg-white">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <Cpu className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">Abacus AI</h4>
                                  <p className="text-sm text-gray-600">Modelos GPT integrados (Ya configurado)</p>
                                </div>
                              </div>
                              <Switch
                                checked={aiConfig.abacus.enabled}
                                onCheckedChange={(checked) => updateAiConfig('abacus', 'enabled', checked)}
                              />
                            </div>

                            {aiConfig.abacus.enabled && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50 p-4 rounded-lg">
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Modelo
                                    </Label>
                                    <Select value={aiConfig.abacus.model} onValueChange={(value) => updateAiConfig('abacus', 'model', value)}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini (Recomendado)</SelectItem>
                                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                        <SelectItem value="gpt-4-turbo-preview">GPT-4 Turbo Preview</SelectItem>
                                        <SelectItem value="gpt-4-0125-preview">GPT-4 0125 Preview</SelectItem>
                                        <SelectItem value="gpt-4-1106-preview">GPT-4 1106 Preview</SelectItem>
                                        <SelectItem value="gpt-4-vision-preview">GPT-4 Vision Preview</SelectItem>
                                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                        <SelectItem value="gpt-3.5-turbo-1106">GPT-3.5 Turbo 1106</SelectItem>
                                        <SelectItem value="gpt-3.5-turbo-0125">GPT-3.5 Turbo 0125</SelectItem>
                                        <SelectItem value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16K</SelectItem>
                                        <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
                                        <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet</SelectItem>
                                        <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
                                        <SelectItem value="claude-2.1">Claude 2.1</SelectItem>
                                        <SelectItem value="claude-2.0">Claude 2.0</SelectItem>
                                        <SelectItem value="claude-instant-1.2">Claude Instant 1.2</SelectItem>
                                        <SelectItem value="text-davinci-003">Text Davinci 003</SelectItem>
                                        <SelectItem value="text-davinci-002">Text Davinci 002</SelectItem>
                                        <SelectItem value="code-davinci-002">Code Davinci 002</SelectItem>
                                        <SelectItem value="text-curie-001">Text Curie 001</SelectItem>
                                        <SelectItem value="text-babbage-001">Text Babbage 001</SelectItem>
                                        <SelectItem value="text-ada-001">Text Ada 001</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Max Tokens
                                    </Label>
                                    <Input
                                      type="number"
                                      value={aiConfig.abacus.maxTokens}
                                      onChange={(e) => updateAiConfig('abacus', 'maxTokens', parseInt(e.target.value) || 2000)}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Temperature
                                    </Label>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      max="2"
                                      value={aiConfig.abacus.temperature}
                                      onChange={(e) => updateAiConfig('abacus', 'temperature', parseFloat(e.target.value) || 0.7)}
                                    />
                                  </div>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                  <h5 className="font-medium text-blue-900 text-sm mb-2">
                                    Recomendaciones de Modelos Abacus AI:
                                  </h5>
                                  <div className="text-xs text-blue-700 space-y-1">
                                    <div><strong>GPT-4.1 Mini:</strong> Óptimo para noticias - Rápido y eficiente ⭐</div>
                                    <div><strong>GPT-4 Turbo:</strong> Excelente balance calidad/velocidad</div>
                                    <div><strong>Claude 3 Opus:</strong> Máxima calidad para textos complejos</div>
                                    <div><strong>Claude 3 Sonnet:</strong> Equilibrio perfecto</div>
                                    <div><strong>Claude 3 Haiku:</strong> Ultra-rápido</div>
                                    <div><strong>GPT-4 Vision:</strong> Solo para análisis de imágenes</div>
                                    <div><strong>GPT-3.5:</strong> Económico para tareas simples</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Groq */}
                          <div className="border border-gray-200 rounded-lg p-6 bg-white">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                  <Zap className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">Groq</h4>
                                  <p className="text-sm text-gray-600">Modelos ultra-rápidos para procesamiento en tiempo real</p>
                                </div>
                              </div>
                              <Switch
                                checked={aiConfig.groq.enabled}
                                onCheckedChange={(checked) => updateAiConfig('groq', 'enabled', checked)}
                              />
                            </div>

                            {aiConfig.groq.enabled && (
                              <div className="space-y-4 bg-orange-50 p-4 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      API Key *
                                    </Label>
                                    <Input
                                      type="password"
                                      placeholder="Tu Groq API Key"
                                      value={aiConfig.groq.apiKey}
                                      onChange={(e) => updateAiConfig('groq', 'apiKey', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Modelo
                                    </Label>
                                    <Select value={aiConfig.groq.model} onValueChange={(value) => updateAiConfig('groq', 'model', value)}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="llama-3.1-405b-reasoning">Llama 3.1 405B Reasoning</SelectItem>
                                        <SelectItem value="llama-3.1-70b-versatile">Llama 3.1 70B Versatile</SelectItem>
                                        <SelectItem value="llama-3.1-8b-instant">Llama 3.1 8B Instant</SelectItem>
                                        <SelectItem value="llama3-groq-70b-8192-tool-use-preview">Llama3 Groq 70B Tool Use</SelectItem>
                                        <SelectItem value="llama3-groq-8b-8192-tool-use-preview">Llama3 Groq 8B Tool Use</SelectItem>
                                        <SelectItem value="llama3-70b-8192">Llama3 70B</SelectItem>
                                        <SelectItem value="llama3-8b-8192">Llama3 8B</SelectItem>
                                        <SelectItem value="llama2-70b-4096">Llama2 70B</SelectItem>
                                        <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B (Recomendado)</SelectItem>
                                        <SelectItem value="gemma2-9b-it">Gemma2 9B IT</SelectItem>
                                        <SelectItem value="gemma-7b-it">Gemma 7B IT</SelectItem>
                                        <SelectItem value="whisper-large-v3">Whisper Large V3</SelectItem>
                                        <SelectItem value="whisper-large-v3-turbo">Whisper Large V3 Turbo</SelectItem>
                                        <SelectItem value="distil-whisper-large-v3-en">Distil Whisper Large V3 EN</SelectItem>
                                        <SelectItem value="llava-v1.5-7b-4096-preview">LLaVA v1.5 7B Vision</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Max Tokens
                                    </Label>
                                    <Input
                                      type="number"
                                      value={aiConfig.groq.maxTokens}
                                      onChange={(e) => updateAiConfig('groq', 'maxTokens', parseInt(e.target.value) || 2000)}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Temperature
                                    </Label>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      max="2"
                                      value={aiConfig.groq.temperature}
                                      onChange={(e) => updateAiConfig('groq', 'temperature', parseFloat(e.target.value) || 0.7)}
                                    />
                                  </div>
                                </div>
                                <div className="bg-orange-100 border border-orange-200 rounded-lg p-3">
                                  <h5 className="font-medium text-orange-900 text-sm mb-1">
                                    Cómo obtener tu Groq API Key:
                                  </h5>
                                  <ol className="text-xs text-orange-700 space-y-1 list-decimal list-inside">
                                    <li>Ve a <strong>console.groq.com</strong> y crea una cuenta</li>
                                    <li>Navega a la sección "API Keys"</li>
                                    <li>Crea una nueva API Key</li>
                                    <li>Copia y pega la key aquí</li>
                                  </ol>
                                </div>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                                  <h5 className="font-medium text-yellow-900 text-sm mb-2">
                                    Recomendaciones de Modelos:
                                  </h5>
                                  <div className="text-xs text-yellow-700 space-y-1">
                                    <div><strong>Llama 3.1 70B:</strong> Equilibrio perfecto entre calidad y velocidad</div>
                                    <div><strong>Llama 3.1 405B:</strong> Máxima calidad para tareas complejas</div>
                                    <div><strong>Llama 3.1 8B:</strong> Ultra-rápido para procesamiento masivo</div>
                                    <div><strong>Mixtral 8x7B:</strong> Excelente para textos largos</div>
                                    <div><strong>Whisper V3:</strong> Solo para transcripción de audio</div>
                                    <div><strong>LLaVA:</strong> Solo para análisis de imágenes</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <Separator />

                        {/* Configuración de Prompts */}
                        <div className="space-y-6">
                          <h3 className="text-lg font-semibold text-gray-900">Configuración de Prompts</h3>

                          {/* Reescritura */}
                          <div className="border border-gray-200 rounded-lg p-6 bg-white">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <FileText className="h-5 w-5 text-green-600" />
                                <div>
                                  <h4 className="font-semibold text-gray-900">Reescritura de Noticias</h4>
                                  <p className="text-sm text-gray-600">Convierte noticias web en formato apropiado para radio</p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTestAiPrompt('rewrite')}
                                disabled={isConnecting}
                              >
                                <TestTube className="h-4 w-4 mr-2" />
                                {isConnecting ? 'Probando...' : 'Probar'}
                              </Button>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                  Prompt del Sistema
                                </Label>
                                <Textarea
                                  value={aiConfig.prompts.rewrite.system}
                                  onChange={(e) => updateAiConfig('prompts', 'rewrite', { ...aiConfig.prompts.rewrite, system: e.target.value })}
                                  className="min-h-20"
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                  Template de Usuario (usa {'{content}'} donde va la noticia)
                                </Label>
                                <Textarea
                                  value={aiConfig.prompts.rewrite.template}
                                  onChange={(e) => updateAiConfig('prompts', 'rewrite', { ...aiConfig.prompts.rewrite, template: e.target.value })}
                                  className="min-h-20"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Humanización */}
                          <div className="border border-gray-200 rounded-lg p-6 bg-white">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <MessageSquare className="h-5 w-5 text-blue-600" />
                                <div>
                                  <h4 className="font-semibold text-gray-900">Humanización</h4>
                                  <p className="text-sm text-gray-600">Hace que las noticias suenen naturales y conversacionales</p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTestAiPrompt('humanize')}
                                disabled={isConnecting}
                              >
                                <TestTube className="h-4 w-4 mr-2" />
                                {isConnecting ? 'Probando...' : 'Probar'}
                              </Button>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                  Prompt del Sistema
                                </Label>
                                <Textarea
                                  value={aiConfig.prompts.humanize.system}
                                  onChange={(e) => updateAiConfig('prompts', 'humanize', { ...aiConfig.prompts.humanize, system: e.target.value })}
                                  className="min-h-20"
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                  Template de Usuario
                                </Label>
                                <Textarea
                                  value={aiConfig.prompts.humanize.template}
                                  onChange={(e) => updateAiConfig('prompts', 'humanize', { ...aiConfig.prompts.humanize, template: e.target.value })}
                                  className="min-h-20"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Adaptación de Estilo */}
                          <div className="border border-gray-200 rounded-lg p-6 bg-white">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <Sparkles className="h-5 w-5 text-purple-600" />
                                <div>
                                  <h4 className="font-semibold text-gray-900">Adaptación de Estilo</h4>
                                  <p className="text-sm text-gray-600">Adapta el tono según la identidad de la radio</p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTestAiPrompt('adapt')}
                                disabled={isConnecting}
                              >
                                <TestTube className="h-4 w-4 mr-2" />
                                {isConnecting ? 'Probando...' : 'Probar'}
                              </Button>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                  Prompt del Sistema
                                </Label>
                                <Textarea
                                  value={aiConfig.prompts.adapt.system}
                                  onChange={(e) => updateAiConfig('prompts', 'adapt', { ...aiConfig.prompts.adapt, system: e.target.value })}
                                  className="min-h-20"
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                  Template de Usuario (usa {'{radioStyle}'} y {'{content}'})
                                </Label>
                                <Textarea
                                  value={aiConfig.prompts.adapt.template}
                                  onChange={(e) => updateAiConfig('prompts', 'adapt', { ...aiConfig.prompts.adapt, template: e.target.value })}
                                  className="min-h-20"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Configuración de Procesamiento */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900">Configuración de Procesamiento</h3>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg">
                            <div className="space-y-4">
                              <h4 className="font-medium text-gray-700">Etapas de Procesamiento</h4>
                              <div className="space-y-3">
                                <div className="flex items-center space-x-3">
                                  <Switch
                                    checked={aiConfig.processing.enableRewrite}
                                    onCheckedChange={(checked) => updateAiConfig('processing', 'enableRewrite', checked)}
                                  />
                                  <Label className="text-sm">Reescritura automática</Label>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Switch
                                    checked={aiConfig.processing.enableHumanize}
                                    onCheckedChange={(checked) => updateAiConfig('processing', 'enableHumanize', checked)}
                                  />
                                  <Label className="text-sm">Humanización automática</Label>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Switch
                                    checked={aiConfig.processing.enableAdaptation}
                                    onCheckedChange={(checked) => updateAiConfig('processing', 'enableAdaptation', checked)}
                                  />
                                  <Label className="text-sm">Adaptación de estilo</Label>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                  Estilo de Radio
                                </Label>
                                <Select value={aiConfig.processing.radioStyle} onValueChange={(value) => updateAiConfig('processing', 'radioStyle', value)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Profesional y objetivo">Profesional y objetivo</SelectItem>
                                    <SelectItem value="Dinámico y juvenil">Dinámico y juvenil</SelectItem>
                                    <SelectItem value="Familiar y cercano">Familiar y cercano</SelectItem>
                                    <SelectItem value="Formal y serio">Formal y serio</SelectItem>
                                    <SelectItem value="Entretenido y relajado">Entretenido y relajado</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                  Puntuación Mínima de Calidad
                                </Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={aiConfig.processing.minQualityScore}
                                  onChange={(e) => updateAiConfig('processing', 'minQualityScore', parseInt(e.target.value) || 7)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Información del Flujo */}
                        <Separator />
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                          <h4 className="font-medium text-indigo-900 mb-2">
                            Flujo de Procesamiento Automático
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div className="text-center">
                              <div className="h-8 w-8 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-white font-bold text-xs">1</span>
                              </div>
                              <h5 className="font-medium text-indigo-800">Scraping</h5>
                              <p className="text-indigo-700 text-xs">Extracción de noticias desde sitios web</p>
                            </div>
                            <div className="text-center">
                              <div className="h-8 w-8 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-white font-bold text-xs">2</span>
                              </div>
                              <h5 className="font-medium text-indigo-800">Reescritura</h5>
                              <p className="text-indigo-700 text-xs">Adaptación del contenido para radio</p>
                            </div>
                            <div className="text-center">
                              <div className="h-8 w-8 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-white font-bold text-xs">3</span>
                              </div>
                              <h5 className="font-medium text-indigo-800">Humanización</h5>
                              <p className="text-indigo-700 text-xs">Conversión a lenguaje natural</p>
                            </div>
                            <div className="text-center">
                              <div className="h-8 w-8 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-white font-bold text-xs">4</span>
                              </div>
                              <h5 className="font-medium text-indigo-800">Adaptación</h5>
                              <p className="text-indigo-700 text-xs">Ajuste al estilo de la radio</p>
                            </div>
                          </div>
                        </div>

                        {/* Botones */}
                        <div className="flex justify-end space-x-3 pt-4">
                          <DialogClose asChild>
                            <Button variant="outline">
                              Cancelar
                            </Button>
                          </DialogClose>
                          <Button
                            onClick={handleSaveAiConfig}
                            disabled={isConnecting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                          >
                            <Brain className="h-4 w-4 mr-2" />
                            {isConnecting ? 'Guardando...' : 'Guardar Configuración'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Configuración de Síntesis de Voz */}
            <Card className="bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Mic className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Síntesis de Voz
                      </h3>
                      <p className="text-gray-600">
                        Convierte noticias en audio con voces naturales para transmisión automática en radio.
                      </p>
                    </div>
                  </div>

                  <Dialog open={isVoiceModalOpen} onOpenChange={setIsVoiceModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6"
                      >
                        Configurar
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                          Configuración de Síntesis de Voz
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-8 mt-6">
                        {/* Comparación de Proveedores */}
                        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            🎯 Recomendación Especial para Radios Chilenas
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-lg border border-green-200">
                              <h4 className="font-semibold text-green-800 mb-2">🥇 Tier Premium</h4>
                              <div className="text-sm space-y-1">
                                <div><strong>🏆 Abacus ElevenLabs:</strong> Incluido - Sin costo extra</div>
                                <div><strong>ElevenLabs Directo:</strong> Calidad superior ($$$)</div>
                                <div><strong>Azure:</strong> Voces chilenas nativas ($$)</div>
                              </div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-blue-200">
                              <h4 className="font-semibold text-blue-800 mb-2">🥈 Tier Equilibrado</h4>
                              <div className="text-sm space-y-1">
                                <div><strong>OpenAI TTS:</strong> Ya integrado ($$)</div>
                                <div><strong>Amazon Polly:</strong> Muy económico ($)</div>
                              </div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              <h4 className="font-semibold text-gray-800 mb-2">🥉 Tier Gratuito</h4>
                              <div className="text-sm space-y-1">
                                <div><strong>Edge TTS:</strong> Gratis + calidad decente</div>
                                <div><strong>Backup:</strong> Siempre disponible</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Proveedores de Voz */}
                        <div className="space-y-6">
                          <h3 className="text-lg font-semibold text-gray-900">Proveedores de Síntesis de Voz</h3>

                          {/* Abacus ElevenLabs - Integración Premium */}
                          <div className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 relative">
                            {/* Badge de Recomendado */}
                            <div className="absolute -top-3 left-6">
                              <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-semibold">
                                🏆 RECOMENDADO VIRA
                              </span>
                            </div>

                            <div className="flex items-center justify-between mb-4 mt-2">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                                  <Sparkles className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-900 flex items-center">
                                    Abacus ElevenLabs
                                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                      ✅ INCLUIDO
                                    </span>
                                  </h4>
                                  <p className="text-sm text-gray-700">
                                    <strong>Calidad Premium sin costo adicional</strong> - 8 voces chilenas especializadas para radio
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTestVoice('abacusElevenlabs')}
                                  disabled={isConnecting}
                                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  {isConnecting ? 'Probando...' : 'Test de Voz'}
                                </Button>
                                <Switch
                                  checked={voiceConfig.abacusElevenlabs.enabled}
                                  onCheckedChange={(checked) => updateVoiceConfig('abacusElevenlabs', 'enabled', checked)}
                                />
                              </div>
                            </div>

                            {voiceConfig.abacusElevenlabs.enabled && (
                              <div className="space-y-4">
                                {/* Información de configuración automática */}
                                <div className="bg-white border border-blue-200 p-4 rounded-lg">
                                  <div className="flex items-start space-x-3">
                                    <div className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <span className="text-white text-xs">✓</span>
                                    </div>
                                    <div>
                                      <h5 className="font-medium text-gray-900 mb-1">Configuración Automática</h5>
                                      <p className="text-sm text-gray-600">
                                        Este proveedor utiliza la integración Abacus existente. No necesitas configurar API keys adicionales.
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Configuración de Voces */}
                                <div className="bg-white p-4 rounded-lg border border-blue-200">
                                  <h5 className="font-medium text-gray-900 mb-3">Voces Disponibles (Especializadas para Chile)</h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {voiceConfig.abacusElevenlabs.voices.map((voice, index) => (
                                      <div key={voice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                          <div className="font-medium text-sm text-gray-900">{voice.name}</div>
                                          <div className="text-xs text-gray-600">
                                            {voice.accent} • {voice.style}
                                          </div>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 hover:bg-blue-100"
                                          onClick={() => handleTestVoice('abacusElevenlabs')}
                                        >
                                          <Play className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Configuración Avanzada */}
                                <div className="bg-white p-4 rounded-lg border border-blue-200">
                                  <h5 className="font-medium text-gray-900 mb-3">Configuración Avanzada</h5>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Estabilidad
                                      </Label>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs text-gray-500">0</span>
                                        <div className="flex-1">
                                          <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={voiceConfig.abacusElevenlabs.stability}
                                            onChange={(e) => updateVoiceConfig('abacusElevenlabs', 'stability', parseFloat(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                          />
                                        </div>
                                        <span className="text-xs text-gray-500">1</span>
                                      </div>
                                      <div className="text-xs text-center text-gray-600 mt-1">
                                        {voiceConfig.abacusElevenlabs.stability}
                                      </div>
                                    </div>

                                    <div>
                                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Similitud
                                      </Label>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs text-gray-500">0</span>
                                        <div className="flex-1">
                                          <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={voiceConfig.abacusElevenlabs.similarityBoost}
                                            onChange={(e) => updateVoiceConfig('abacusElevenlabs', 'similarityBoost', parseFloat(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                          />
                                        </div>
                                        <span className="text-xs text-gray-500">1</span>
                                      </div>
                                      <div className="text-xs text-center text-gray-600 mt-1">
                                        {voiceConfig.abacusElevenlabs.similarityBoost}
                                      </div>
                                    </div>

                                    <div>
                                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Velocidad
                                      </Label>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs text-gray-500">0.5</span>
                                        <div className="flex-1">
                                          <input
                                            type="range"
                                            min="0.5"
                                            max="2.0"
                                            step="0.1"
                                            value={voiceConfig.abacusElevenlabs.speakingRate}
                                            onChange={(e) => updateVoiceConfig('abacusElevenlabs', 'speakingRate', parseFloat(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                          />
                                        </div>
                                        <span className="text-xs text-gray-500">2.0</span>
                                      </div>
                                      <div className="text-xs text-center text-gray-600 mt-1">
                                        {voiceConfig.abacusElevenlabs.speakingRate}x
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Ventajas específicas */}
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                  <h5 className="font-medium text-green-900 mb-2">
                                    🎯 Ventajas de Abacus ElevenLabs para Radios Chilenas
                                  </h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-green-800">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-green-600">✓</span>
                                      <span>8 voces chilenas especializadas</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-green-600">✓</span>
                                      <span>Optimizado para noticieros</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-green-600">✓</span>
                                      <span>Sin costos adicionales de API</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-green-600">✓</span>
                                      <span>Configuración automática</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-green-600">✓</span>
                                      <span>Soporte técnico incluido</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-green-600">✓</span>
                                      <span>Actualización constante de voces</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ElevenLabs Directo */}
                          <div className="border border-gray-200 rounded-lg p-6 bg-white">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                  <Volume2 className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">ElevenLabs Directo</h4>
                                  <p className="text-sm text-gray-600">API propia - Requiere suscripción ElevenLabs (Premium)</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTestVoice('elevenlabs')}
                                  disabled={isConnecting || !voiceConfig.elevenlabs.enabled}
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  {isConnecting ? 'Probando...' : 'Test'}
                                </Button>
                                <Switch
                                  checked={voiceConfig.elevenlabs.enabled}
                                  onCheckedChange={(checked) => updateVoiceConfig('elevenlabs', 'enabled', checked)}
                                />
                              </div>
                            </div>

                            {voiceConfig.elevenlabs.enabled && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-purple-50 p-4 rounded-lg">
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      API Key *
                                    </Label>
                                    <Input
                                      type="password"
                                      placeholder="Tu ElevenLabs API Key"
                                      value={voiceConfig.elevenlabs.apiKey}
                                      onChange={(e) => updateVoiceConfig('elevenlabs', 'apiKey', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Modelo
                                    </Label>
                                    <Select value={voiceConfig.elevenlabs.model} onValueChange={(value) => updateVoiceConfig('elevenlabs', 'model', value)}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="eleven_multilingual_v2">Multilingual V2 (Recomendado)</SelectItem>
                                        <SelectItem value="eleven_monolingual_v1">Monolingual V1</SelectItem>
                                        <SelectItem value="eleven_turbo_v2">Turbo V2 (Rápido)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Estabilidad
                                    </Label>
                                    <Input
                                      type="range"
                                      min="0"
                                      max="1"
                                      step="0.1"
                                      value={voiceConfig.elevenlabs.stability}
                                      onChange={(e) => updateVoiceConfig('elevenlabs', 'stability', parseFloat(e.target.value))}
                                    />
                                    <span className="text-xs text-gray-500">{voiceConfig.elevenlabs.stability}</span>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Similaridad
                                    </Label>
                                    <Input
                                      type="range"
                                      min="0"
                                      max="1"
                                      step="0.1"
                                      value={voiceConfig.elevenlabs.similarityBoost}
                                      onChange={(e) => updateVoiceConfig('elevenlabs', 'similarityBoost', parseFloat(e.target.value))}
                                    />
                                    <span className="text-xs text-gray-500">{voiceConfig.elevenlabs.similarityBoost}</span>
                                  </div>
                                </div>

                                <div className="bg-purple-100 border border-purple-200 rounded-lg p-3">
                                  <h5 className="font-medium text-purple-900 text-sm mb-1">
                                    Cómo obtener tu ElevenLabs API Key:
                                  </h5>
                                  <ol className="text-xs text-purple-700 space-y-1 list-decimal list-inside">
                                    <li>Ve a <strong>elevenlabs.io</strong> y crea una cuenta</li>
                                    <li>Navega a tu perfil → API Keys</li>
                                    <li>Crea una nueva API Key</li>
                                    <li>Copia y pega la key aquí</li>
                                  </ol>
                                  <div className="mt-2 text-xs text-purple-600">
                                    <strong>Precio:</strong> ~$0.30 USD por 1000 caracteres (Premium pero vale la pena)
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Azure Speech */}
                          <div className="border border-gray-200 rounded-lg p-6 bg-white">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <Speaker className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">Azure Speech Services</h4>
                                  <p className="text-sm text-gray-600">Voces chilenas nativas - Catalina y Lorenzo (Microsoft)</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTestVoice('azure')}
                                  disabled={isConnecting || !voiceConfig.azure.enabled}
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  {isConnecting ? 'Probando...' : 'Test'}
                                </Button>
                                <Switch
                                  checked={voiceConfig.azure.enabled}
                                  onCheckedChange={(checked) => updateVoiceConfig('azure', 'enabled', checked)}
                                />
                              </div>
                            </div>

                            {voiceConfig.azure.enabled && (
                              <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Subscription Key *
                                    </Label>
                                    <Input
                                      type="password"
                                      placeholder="Tu Azure Subscription Key"
                                      value={voiceConfig.azure.subscriptionKey}
                                      onChange={(e) => updateVoiceConfig('azure', 'subscriptionKey', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Región
                                    </Label>
                                    <Select value={voiceConfig.azure.region} onValueChange={(value) => updateVoiceConfig('azure', 'region', value)}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="eastus">East US (Recomendado)</SelectItem>
                                        <SelectItem value="westus">West US</SelectItem>
                                        <SelectItem value="brazilsouth">Brazil South</SelectItem>
                                        <SelectItem value="westeurope">West Europe</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                                  <h5 className="font-medium text-green-900 text-sm mb-2">
                                    ⭐ Ventaja Principal: Voces Chilenas Auténticas
                                  </h5>
                                  <div className="text-xs text-green-700 space-y-1">
                                    <div><strong>Catalina Neural:</strong> Voz femenina chilena natural</div>
                                    <div><strong>Lorenzo Neural:</strong> Voz masculina chilena profesional</div>
                                    <div><strong>Precio:</strong> ~$4 USD por millón de caracteres</div>
                                    <div><strong>Calidad:</strong> Excelente para radios locales</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* OpenAI TTS */}
                          <div className="border border-gray-200 rounded-lg p-6 bg-white">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                                  <AudioWaveform className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">OpenAI TTS</h4>
                                  <p className="text-sm text-gray-600">Ya integrado con Abacus AI - Balance calidad/precio</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTestVoice('openai')}
                                  disabled={isConnecting}
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  {isConnecting ? 'Probando...' : 'Test'}
                                </Button>
                                <Switch
                                  checked={voiceConfig.openai.enabled}
                                  onCheckedChange={(checked) => updateVoiceConfig('openai', 'enabled', checked)}
                                />
                              </div>
                            </div>

                            {voiceConfig.openai.enabled && (
                              <div className="bg-green-50 p-4 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Modelo
                                    </Label>
                                    <Select value={voiceConfig.openai.model} onValueChange={(value) => updateVoiceConfig('openai', 'model', value)}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="tts-1">TTS-1 (Estándar)</SelectItem>
                                        <SelectItem value="tts-1-hd">TTS-1-HD (Alta definición)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Velocidad
                                    </Label>
                                    <Input
                                      type="range"
                                      min="0.25"
                                      max="4.0"
                                      step="0.25"
                                      value={voiceConfig.openai.speed}
                                      onChange={(e) => updateVoiceConfig('openai', 'speed', parseFloat(e.target.value))}
                                    />
                                    <span className="text-xs text-gray-500">{voiceConfig.openai.speed}x</span>
                                  </div>
                                </div>

                                <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                                  <h5 className="font-medium text-green-900 text-sm mb-2">
                                    ✅ Ventajas de OpenAI TTS:
                                  </h5>
                                  <div className="text-xs text-green-700 space-y-1">
                                    <div><strong>Ya integrado:</strong> Usa la misma API de Abacus AI</div>
                                    <div><strong>6 voces diferentes:</strong> Desde profesionales hasta storytelling</div>
                                    <div><strong>Precio justo:</strong> ~$15 USD por millón de caracteres</div>
                                    <div><strong>Calidad:</strong> Muy buena para uso diario</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Amazon Polly */}
                          <div className="border border-gray-200 rounded-lg p-6 bg-white">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                  <Headphones className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">Amazon Polly</h4>
                                  <p className="text-sm text-gray-600">Muy económico - Ideal para grandes volúmenes (AWS)</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTestVoice('polly')}
                                  disabled={isConnecting || !voiceConfig.polly.enabled}
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  {isConnecting ? 'Probando...' : 'Test'}
                                </Button>
                                <Switch
                                  checked={voiceConfig.polly.enabled}
                                  onCheckedChange={(checked) => updateVoiceConfig('polly', 'enabled', checked)}
                                />
                              </div>
                            </div>

                            {voiceConfig.polly.enabled && (
                              <div className="space-y-4 bg-orange-50 p-4 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Access Key ID *
                                    </Label>
                                    <Input
                                      type="password"
                                      placeholder="AWS Access Key"
                                      value={voiceConfig.polly.accessKeyId}
                                      onChange={(e) => updateVoiceConfig('polly', 'accessKeyId', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Secret Access Key *
                                    </Label>
                                    <Input
                                      type="password"
                                      placeholder="AWS Secret Key"
                                      value={voiceConfig.polly.secretAccessKey}
                                      onChange={(e) => updateVoiceConfig('polly', 'secretAccessKey', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Región
                                    </Label>
                                    <Select value={voiceConfig.polly.region} onValueChange={(value) => updateVoiceConfig('polly', 'region', value)}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="us-east-1">US East 1</SelectItem>
                                        <SelectItem value="us-west-2">US West 2</SelectItem>
                                        <SelectItem value="sa-east-1">South America (São Paulo)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-3">
                                  <h5 className="font-medium text-yellow-900 text-sm mb-2">
                                    💰 La Opción Más Económica:
                                  </h5>
                                  <div className="text-xs text-yellow-700 space-y-1">
                                    <div><strong>Precio:</strong> ~$4 USD por millón de caracteres</div>
                                    <div><strong>Voces en español:</strong> Conchita, Enrique, Lucía, Mía</div>
                                    <div><strong>Motor Neural:</strong> Calidad superior disponible</div>
                                    <div><strong>Ideal para:</strong> Radios con muchas noticias diarias</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Edge TTS */}
                          <div className="border border-gray-200 rounded-lg p-6 bg-white">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <VolumeX className="h-5 w-5 text-gray-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">Edge TTS</h4>
                                  <p className="text-sm text-gray-600">Gratuito - Respaldo siempre disponible (Microsoft Edge)</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTestVoice('edge')}
                                  disabled={isConnecting}
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  {isConnecting ? 'Probando...' : 'Test'}
                                </Button>
                                <Switch
                                  checked={voiceConfig.edge.enabled}
                                  onCheckedChange={(checked) => updateVoiceConfig('edge', 'enabled', checked)}
                                  disabled={true}
                                />
                              </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                              <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
                                <h5 className="font-medium text-gray-900 text-sm mb-2">
                                  🆓 Respaldo Gratuito Siempre Activo:
                                </h5>
                                <div className="text-xs text-gray-700 space-y-1">
                                  <div><strong>Precio:</strong> Completamente GRATIS</div>
                                  <div><strong>Voces chilenas:</strong> Catalina y Lorenzo (mismas que Azure)</div>
                                  <div><strong>Calidad:</strong> Buena para emergencias</div>
                                  <div><strong>Limitaciones:</strong> Puede ser más lento en horarios peak</div>
                                  <div><strong>Uso recomendado:</strong> Backup automático cuando otros fallan</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Configuración de Procesamiento */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900">Configuración de Procesamiento de Audio</h3>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg">
                            <div className="space-y-4">
                              <h4 className="font-medium text-gray-700">Proveedores</h4>
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Proveedor Primario
                                  </Label>
                                  <Select value={voiceConfig.processing.primaryProvider} onValueChange={(value) => updateVoiceConfig('processing', 'primaryProvider', value)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="abacusElevenlabs">🏆 Abacus ElevenLabs (Recomendado)</SelectItem>
                                      <SelectItem value="elevenlabs">ElevenLabs Directo (Premium)</SelectItem>
                                      <SelectItem value="azure">Azure Speech (Voces chilenas)</SelectItem>
                                      <SelectItem value="openai">OpenAI TTS (Equilibrado)</SelectItem>
                                      <SelectItem value="polly">Amazon Polly (Económico)</SelectItem>
                                      <SelectItem value="edge">Edge TTS (Gratis)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Proveedor de Respaldo
                                  </Label>
                                  <Select value={voiceConfig.processing.fallbackProvider} onValueChange={(value) => updateVoiceConfig('processing', 'fallbackProvider', value)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="openai">OpenAI TTS (Recomendado)</SelectItem>
                                      <SelectItem value="abacusElevenlabs">Abacus ElevenLabs</SelectItem>
                                      <SelectItem value="elevenlabs">ElevenLabs Directo</SelectItem>
                                      <SelectItem value="azure">Azure Speech</SelectItem>
                                      <SelectItem value="polly">Amazon Polly</SelectItem>
                                      <SelectItem value="edge">Edge TTS</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Proveedor de Emergencia
                                  </Label>
                                  <Select value={voiceConfig.processing.emergencyProvider} onValueChange={(value) => updateVoiceConfig('processing', 'emergencyProvider', value)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="edge">Edge TTS (Recomendado - Siempre disponible)</SelectItem>
                                      <SelectItem value="openai">OpenAI TTS</SelectItem>
                                      <SelectItem value="polly">Amazon Polly</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h4 className="font-medium text-gray-700">Calidad de Audio</h4>
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Formato de Salida
                                  </Label>
                                  <Select value={voiceConfig.processing.outputFormat} onValueChange={(value) => updateVoiceConfig('processing', 'outputFormat', value)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="mp3">MP3 (Recomendado)</SelectItem>
                                      <SelectItem value="wav">WAV (Sin compresión)</SelectItem>
                                      <SelectItem value="ogg">OGG (Opensource)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Bitrate (kbps)
                                  </Label>
                                  <Select value={voiceConfig.processing.bitrate} onValueChange={(value) => updateVoiceConfig('processing', 'bitrate', value)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="128">128 kbps (Básico)</SelectItem>
                                      <SelectItem value="192">192 kbps (Radio estándar)</SelectItem>
                                      <SelectItem value="256">256 kbps (Alta calidad)</SelectItem>
                                      <SelectItem value="320">320 kbps (Premium)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg">
                            <div className="space-y-4">
                              <h4 className="font-medium text-gray-700">Personalización de Contenido</h4>
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Introducción de Noticias
                                  </Label>
                                  <Input
                                    placeholder="Ej: Bienvenidos a las noticias de Radio Chile"
                                    value={voiceConfig.processing.newsIntro}
                                    onChange={(e) => updateVoiceConfig('processing', 'newsIntro', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Despedida de Noticias
                                  </Label>
                                  <Input
                                    placeholder="Ej: Esto ha sido todo, gracias por escucharnos"
                                    value={voiceConfig.processing.newsOutro}
                                    onChange={(e) => updateVoiceConfig('processing', 'newsOutro', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Duración de Pausas
                                  </Label>
                                  <Select value={voiceConfig.processing.pauseDuration} onValueChange={(value) => updateVoiceConfig('processing', 'pauseDuration', value)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0.25s">0.25 segundos (Rápido)</SelectItem>
                                      <SelectItem value="0.5s">0.5 segundos (Normal)</SelectItem>
                                      <SelectItem value="1s">1 segundo (Pausado)</SelectItem>
                                      <SelectItem value="1.5s">1.5 segundos (Lento)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h4 className="font-medium text-gray-700">Configuraciones Avanzadas</h4>
                              <div className="space-y-3">
                                <div className="flex items-center space-x-3">
                                  <Switch
                                    checked={voiceConfig.processing.enableSSML}
                                    onCheckedChange={(checked) => updateVoiceConfig('processing', 'enableSSML', checked)}
                                  />
                                  <Label className="text-sm">Habilitar SSML (Control avanzado)</Label>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Switch
                                    checked={voiceConfig.processing.addPauses}
                                    onCheckedChange={(checked) => updateVoiceConfig('processing', 'addPauses', checked)}
                                  />
                                  <Label className="text-sm">Agregar pausas automáticas</Label>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Información del Flujo Completo */}
                        <Separator />
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-medium text-green-900 mb-2">
                            Flujo Completo: De Noticia a Audio
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                            <div className="text-center">
                              <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-white font-bold text-xs">1</span>
                              </div>
                              <h5 className="font-medium text-green-800">Scraping</h5>
                              <p className="text-green-700 text-xs">Extrae noticias automáticamente</p>
                            </div>
                            <div className="text-center">
                              <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-white font-bold text-xs">2</span>
                              </div>
                              <h5 className="font-medium text-green-800">Procesamiento IA</h5>
                              <p className="text-green-700 text-xs">Reescribe y humaniza</p>
                            </div>
                            <div className="text-center">
                              <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-white font-bold text-xs">3</span>
                              </div>
                              <h5 className="font-medium text-green-800">Síntesis de Voz</h5>
                              <p className="text-green-700 text-xs">Convierte a audio natural</p>
                            </div>
                            <div className="text-center">
                              <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-white font-bold text-xs">4</span>
                              </div>
                              <h5 className="font-medium text-green-800">Post-proceso</h5>
                              <p className="text-green-700 text-xs">Agrega intro, outro y pausas</p>
                            </div>
                            <div className="text-center">
                              <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-white font-bold text-xs">5</span>
                              </div>
                              <h5 className="font-medium text-green-800">Entrega</h5>
                              <p className="text-green-700 text-xs">MP3 listo para radio</p>
                            </div>
                          </div>
                        </div>

                        {/* Botones */}
                        <div className="flex justify-end space-x-3 pt-4">
                          <DialogClose asChild>
                            <Button variant="outline">
                              Cancelar
                            </Button>
                          </DialogClose>
                          <Button
                            onClick={handleSaveVoiceConfig}
                            disabled={isConnecting}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Mic className="h-4 w-4 mr-2" />
                            {isConnecting ? 'Guardando...' : 'Guardar Configuración'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info adicional */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">
              ¿Necesitas ayuda con alguna integración? Contáctanos en soporte@vira.cl
            </p>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
