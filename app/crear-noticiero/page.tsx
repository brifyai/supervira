'use client'

export const dynamic = 'force-dynamic'

import { toast } from 'react-toastify'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RegionSelector } from '@/components/newscast/RegionSelector'
import { CategorySelector } from '@/components/newscast/CategorySelector'
import { DurationSlider } from '@/components/newscast/DurationSlider'
import { GenerateButton } from '@/components/newscast/GenerateButton'
import { VoiceSelector } from '@/components/newscast/VoiceSelector'
import { VoiceConfig, defaultVoiceConfig, type VoiceConfigSettings } from '@/components/newscast/VoiceConfig'
import { useNewscastGeneration } from '@/hooks/useNewscastGeneration'
import { useSupabaseUser } from '@/hooks/use-supabase-user'  // ✅ Para obtener userId
import { Save, Settings, Music, Clock, Search, Loader2, Newspaper, CheckCircle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { NewsSelectionModal } from '@/components/NewsSelectionModal'

// Interfaces
interface RadioStation {
  id: string
  nombre: string
  frecuencia: string
  region: string
  url?: string
}

// Categorías con soporte para conteo y selección de cantidad
interface CategoryWithCount {
  id: string
  label: string
  checked: boolean
  count?: number       // Noticias disponibles
  selectedCount?: number  // Noticias a usar
}

const initialCategories: CategoryWithCount[] = [
  { id: 'regionales', label: 'Regionales', checked: false, count: 0, selectedCount: 0 },
  { id: 'nacionales', label: 'Nacionales', checked: true, count: 0, selectedCount: 3 },
  { id: 'deportes', label: 'Deportes', checked: false, count: 0, selectedCount: 0 },
  { id: 'economia', label: 'Economía', checked: true, count: 0, selectedCount: 2 },
  { id: 'mundo', label: 'Mundo', checked: false, count: 0, selectedCount: 0 },
  { id: 'tendencias', label: 'Tendencias', checked: false, count: 0, selectedCount: 0 },
  { id: 'politica', label: 'Política', checked: true, count: 0, selectedCount: 2 },
  { id: 'tecnologia', label: 'Tecnología', checked: false, count: 0, selectedCount: 0 },
]

// Interfaz para noticias escaneadas
interface NewsPreview {
  id: string
  titulo: string
  bajada: string
  url: string
  categoria: string
  fuente: string
  fuente_id: string
  imagen_url?: string
  fecha_publicacion?: string  // ✅ Fecha extraída de URL
  selected?: boolean
}

export default function CrearNoticiero() {
  // ✅ Obtener sesión del usuario para fallback de auth
  const { session } = useSupabaseUser()

  // Estados principales
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedRadio, setSelectedRadio] = useState('')
  const [categories, setCategories] = useState<CategoryWithCount[]>(initialCategories)
  const [loadingStats, setLoadingStats] = useState(false)
  const [duration, setDuration] = useState(15)
  const [adCount, setAdCount] = useState(3)
  const [generateAudio, setGenerateAudio] = useState(false)  // Toggle para generar audio en finalize
  const [selectedVoice, setSelectedVoice] = useState('es-mx')
  const [voiceWPM, setVoiceWPM] = useState(175)  // WPM de la voz seleccionada
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfigSettings>(defaultVoiceConfig)
  const [timeStrategy, setTimeStrategy] = useState('auto')
  const [scheduledTime, setScheduledTime] = useState('08:00')  // Hora programada para el noticiero
  const [includeWeather, setIncludeWeather] = useState(true)

  // Estados para configuración de audio
  const [cortinasEnabled, setCortinasEnabled] = useState(false)
  const [cortinasFrequency, setCortinasFrequency] = useState(3)

  // Estados para radios dinámicas
  const [radioStations, setRadioStations] = useState<RadioStation[]>([])
  const [loadingRadios, setLoadingRadios] = useState(true)
  const [radiosError, setRadiosError] = useState<string | null>(null)

  // Estados para escaneo de fuentes
  const [isScanning, setIsScanning] = useState(false)
  const [scannedNews, setScannedNews] = useState<NewsPreview[]>([])
  const [hasScanned, setHasScanned] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  // News Selection Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [selectedNewsUrls, setSelectedNewsUrls] = useState<string[]>([])

  // Estado de pre-procesamiento
  const [isPreProcessing, setIsPreProcessing] = useState(false)

  // Estado para alertas de scraping (noticias perdidas)
  const [scrapingAlert, setScrapingAlert] = useState<{
    total: number
    exitosos: number
    fallidos: number
    errores: string[]
  } | null>(null)

  // Selección de fuentes (incluye region para indicador visual)
  const [availableSources, setAvailableSources] = useState<{ id: string, nombre_fuente: string, url: string, region: string }[]>([])
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([])
  const [loadingSources, setLoadingSources] = useState(false)
  const [showAllSources, setShowAllSources] = useState(false) // Para expandir/colapsar fuentes adicionales

  // Cargar fuentes disponibles al inicio
  useEffect(() => {
    async function loadSources() {
      setLoadingSources(true)
      try {
        const response = await fetch('/api/scraping/preview')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.fuentes) {
            setAvailableSources(data.fuentes)
            // Por defecto seleccionar todas
            setSelectedSourceIds(data.fuentes.map((f: any) => f.id))
          }
        }
      } catch (error) {
        console.error('Error loading sources:', error)
      } finally {
        setLoadingSources(false)
      }
    }
    loadSources()
  }, [])

  // ✅ AUTO-FILTRAR fuentes cuando cambia la región
  useEffect(() => {
    if (!selectedRegion || availableSources.length === 0) return

    // Filtrar fuentes relevantes para la región seleccionada
    const relevantSources = availableSources.filter(source => {
      const sourceRegion = source.region?.toLowerCase() || 'nacional'
      const targetRegion = selectedRegion.toLowerCase()

      // Si la región es "Nacional", solo incluir fuentes nacionales
      if (targetRegion === 'nacional') {
        return sourceRegion === 'nacional'
      }

      // Para otras regiones: incluir fuentes de esa región + nacionales
      return sourceRegion === targetRegion || sourceRegion === 'nacional'
    })

    setSelectedSourceIds(relevantSources.map(s => s.id))
    setShowAllSources(false) // Colapsar al cambiar región
    console.log(`🌍 Auto-seleccionadas ${relevantSources.length} fuentes para región: ${selectedRegion}`)
  }, [selectedRegion, availableSources])

  // Hook de generación
  const {
    isGenerating,
    progress,
    status,
    error,
    generateNewscast,
    navigateToTimeline,
    reset
  } = useNewscastGeneration()

  // Cargar radios desde la API (multi-tenant, filtrado por usuario)
  useEffect(() => {
    async function loadRadios() {
      try {
        setLoadingRadios(true)
        setRadiosError(null)

        // Usar el API que filtra por user_id automáticamente
        const response = await fetch('/api/radios', {
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error('Error al cargar radios')
        }

        const result = await response.json()
        const data = result.data || result.radios || []

        if (!data || data.length === 0) {
          setRadiosError('No hay radios configuradas. Por favor agrega radios en /activos')
          setRadioStations([])
        } else {
          setRadioStations(data)
          console.log(`✅ ${data.length} radios cargadas desde API`)
        }

      } catch (err) {
        console.error('Error cargando radios:', err)
        setRadiosError('Error al cargar radios desde la base de datos')
        setRadioStations([])
      } finally {
        setLoadingRadios(false)
      }
    }

    loadRadios()
  }, [])

  // Obtener regiones únicas
  const regions = [...new Set(radioStations.map(r => r.region))].sort()

  // Cargar estadísticas de noticias (al inicio y cuando cambia la región)
  useEffect(() => {
    async function loadNewsStats() {
      setLoadingStats(true)
      try {
        // Si hay región seleccionada, filtrar por ella; si no, cargar globales
        const url = selectedRegion
          ? `/api/news-stats?region=${encodeURIComponent(selectedRegion)}`
          : '/api/news-stats'

        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          console.log('📊 News stats loaded:', data)

          // Actualizar conteos de categorías
          setCategories(prev => prev.map(cat => ({
            ...cat,
            count: data.categories[cat.id] || 0,
            // Solo actualizar selectedCount si la categoría está seleccionada y hay noticias
            selectedCount: cat.checked
              ? Math.min(cat.selectedCount || 3, data.categories[cat.id] || 0)
              : 0
          })))
        }
      } catch (error) {
        console.error('Error loading news stats:', error)
      } finally {
        setLoadingStats(false)
      }
    }

    loadNewsStats()
  }, [selectedRegion])

  // Función para escanear fuentes suscritas
  const handleScanSources = async () => {
    setIsScanning(true)
    setScanError(null)

    try {
      console.log('🔍 Iniciando escaneo de fuentes...')
      console.log('📤 sourceIds a enviar:', selectedSourceIds)
      console.log('📤 fuentes seleccionadas:', availableSources.filter(s => selectedSourceIds.includes(s.id)).map(s => s.nombre_fuente))

      const response = await fetch('/api/scraping/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sourceIds: selectedSourceIds,
          region: selectedRegion  // ✅ Enviar región para filtrar fuentes
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al escanear fuentes')
      }

      console.log(`✅ Escaneo completado: ${data.total_noticias} noticias encontradas`)
      console.log('📊 Por categoría:', data.por_categoria)

      // Guardar noticias escaneadas
      setScannedNews(data.noticias || [])
      setHasScanned(true)

      // ✅ Debug: Ver qué categorías devuelve el API
      console.log('📊 Categorías del API:', Object.keys(data.por_categoria || {}))
      console.log('📊 Conteos:', data.por_categoria)

      // Actualizar conteos de categorías con los datos reales del escaneo
      // Calcular nuevas categorías y pre-seleccionar noticias
      const newCategories = categories.map(cat => {
        const categoryName = cat.label
        // ✅ Buscar coincidencia case-insensitive
        const matchingKey = Object.keys(data.por_categoria || {}).find(
          key => key.toLowerCase() === categoryName.toLowerCase()
        )
        const availableCount = matchingKey ? data.por_categoria[matchingKey] : 0

        console.log(`   ${categoryName}: encontradas ${availableCount} (key: ${matchingKey || 'ninguna'})`)

        // ✅ CORREGIDO: Si hay noticias y la categoría está checked, seleccionar hasta 3
        const newSelectedCount = cat.checked && availableCount > 0
          ? Math.min(3, availableCount)
          : 0

        return {
          ...cat,
          count: availableCount,
          selectedCount: newSelectedCount
        }
      })

      setCategories(newCategories)

      // Sincronizar URLs seleccionadas (con comparación case-insensitive)
      const newSelectedUrls: string[] = []
      newCategories.forEach(cat => {
        if (cat.selectedCount && cat.selectedCount > 0) {
          // ✅ Comparación case-insensitive para categorías
          const catNews = (data.noticias || []).filter((n: any) =>
            n.categoria?.toLowerCase() === cat.label.toLowerCase()
          )
          if (catNews.length > 0) {
            newSelectedUrls.push(...catNews.slice(0, cat.selectedCount).map((n: any) => n.url))
          }
        }
      })
      setSelectedNewsUrls(newSelectedUrls)

      toast.success(`✅ ${data.total_noticias} noticias encontradas de ${data.fuentes_escaneadas} fuentes`)

    } catch (error: any) {
      console.error('Error escaneando fuentes:', error)
      setScanError(error.message || 'Error al escanear fuentes')
      toast.error(error.message || 'Error al escanear fuentes')
    } finally {
      setIsScanning(false)
    }
  }

  // --- Handlers para Modal de Selección y Sincronización ---

  const handleOpenModal = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId)
    if (cat) {
      setActiveCategory(cat.label)
      setModalOpen(true)
    }
  }

  const handleToggleNews = (url: string) => {
    setSelectedNewsUrls(prev => {
      const isSelected = prev.includes(url)
      // Toggle logic
      const newSelection = isSelected
        ? prev.filter(u => u !== url)
        : [...prev, url]

      // Sincronizar con el contador de categorías inmediatamente
      const newsItem = scannedNews.find(n => n.url === url)
      if (newsItem) {
        setCategories(cats => cats.map(c => {
          if (c.label === newsItem.categoria) {
            // Contar cuántas de ESTA categoría hay en la nueva selección
            const countForThisCat = newSelection.filter(u => {
              const n = scannedNews.find(sn => sn.url === u)
              return n && n.categoria === c.label
            }).length
            return { ...c, selectedCount: countForThisCat }
          }
          return c
        }))
      }

      return newSelection
    })
  }

  const handleSelectAll = (urls: string[]) => {
    const newSelection = Array.from(new Set([...selectedNewsUrls, ...urls]))
    setSelectedNewsUrls(newSelection)

    // Update category count
    if (urls.length > 0) {
      const sampleUrl = urls[0]
      const newsItem = scannedNews.find(n => n.url === sampleUrl)
      if (newsItem) {
        setCategories(cats => cats.map(c => {
          if (c.label === newsItem.categoria) {
            return { ...c, selectedCount: urls.length }
          }
          return c
        }))
      }
    }
  }

  const handleDeselectAll = (urls: string[]) => {
    const newSelection = selectedNewsUrls.filter(u => !urls.includes(u))
    setSelectedNewsUrls(newSelection)

    if (urls.length > 0) {
      const sampleUrl = urls[0]
      const newsItem = scannedNews.find(n => n.url === sampleUrl)
      if (newsItem) {
        setCategories(cats => cats.map(c => {
          if (c.label === newsItem.categoria) {
            return { ...c, selectedCount: 0 }
          }
          return c
        }))
      }
    }
  }

  // Manejar cambio de categoría desde el selector (+/-)
  const handleCategoryChange = (categoryId: string, checked: boolean, requestedCount?: number) => {
    // 1. Actualizar estado de checked/count en categories
    const targetCat = categories.find(c => c.id === categoryId)
    if (!targetCat) return

    let newCount = requestedCount !== undefined ? requestedCount : (targetCat.selectedCount || 0)
    if (!checked) newCount = 0

    setCategories(prev => prev.map(c => {
      if (c.id === categoryId) {
        return { ...c, checked, selectedCount: newCount }
      }
      return c
    }))

    // 2. Sincronizar URLs seleccionadas (Smart Add/Remove)
    // Obtener URLs actuales de esta categoría
    const currentCatUrls = selectedNewsUrls.filter(u => {
      const n = scannedNews.find(sn => sn.url === u)
      return n && n.categoria === targetCat.label
    })

    const currentCount = currentCatUrls.length

    if (newCount > currentCount) {
      // Debemos AGREGAR noticias (las primeras disponibles no seleccionadas)
      const toAddCount = newCount - currentCount
      const availableNews = scannedNews.filter(n =>
        n.categoria === targetCat.label && !selectedNewsUrls.includes(n.url)
      )
      const toAdd = availableNews.slice(0, toAddCount).map(n => n.url)

      setSelectedNewsUrls(prev => [...prev, ...toAdd])

    } else if (newCount < currentCount) {
      // Debemos QUITAR noticias (las últimas agregadas)
      const toRemoveCount = currentCount - newCount
      // Asumimos que currentCatUrls está ordenado? No necesariamente.
      // Quitamos cualquiera, idealmente las últimas.
      const toRemove = currentCatUrls.slice(-toRemoveCount)
      setSelectedNewsUrls(prev => prev.filter(u => !toRemove.includes(u)))
    }
  }

  // Calcular duración estimada del noticiero
  const totalNewsSelected = categories.reduce((sum, c) => sum + (c.selectedCount || 0), 0)
  const wordsPerNews = 120 // Promedio de palabras por noticia
  const estimatedMinutes = Math.round((totalNewsSelected * wordsPerNews) / voiceWPM)

  // Manejar generación
  const handleGenerate = async () => {
    // Validaciones
    if (!selectedRegion) {
      toast.warning('Por favor selecciona una región')
      return
    }

    if (!selectedRadio) {
      toast.warning('Por favor selecciona una radio')
      return
    }

    const selectedCategoryIds = categories
      .filter(c => c.checked)
      .map(c => c.id)

    if (selectedCategoryIds.length === 0) {
      toast.warning('Por favor selecciona al menos una categoría')
      return
    }

    // Crear configuración detallada de categorías
    const categoryConfig = categories
      .filter(c => c.checked)
      .reduce((acc: any, c) => {
        acc[c.label] = c.selectedCount || 3
        return acc
      }, {})

    // AUTOMATED DEEP SCRAPING
    // Si hay URLs seleccionadas, asegurarnos de que tengan contenido completo antes de generar
    if (selectedNewsUrls.length > 0) {
      setIsPreProcessing(true)
      try {
        toast.info('📥 Obteniendo contenido completo de las noticias seleccionadas...', { autoClose: 3000 })

        // ✅ MEJORADO: Enviar TODAS las URLs seleccionadas, aunque no estén en scannedNews
        const newsToScrape = selectedNewsUrls.map(url => {
          const item = scannedNews.find(n => n.url === url)
          if (item) {
            return {
              url: item.url,
              titulo: item.titulo,
              categoria: item.categoria,
              fuente: item.fuente
            }
          } else {
            // URL seleccionada pero no encontrada en scannedNews - enviar con datos básicos
            console.warn(`⚠️ URL no encontrada en scannedNews, enviando con datos básicos: ${url}`)
            return {
              url: url,
              titulo: 'Noticia seleccionada',
              categoria: 'general',
              fuente: 'Fuente desconocida'
            }
          }
        })

        console.log(`📤 Enviando ${newsToScrape.length} noticias al deep scraping (de ${selectedNewsUrls.length} seleccionadas)`)

        if (newsToScrape.length > 0) {
          const scrapeRes = await fetch('/api/scraping/deep', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              noticias: newsToScrape,
              region: selectedRegion || 'Nacional',
              userId: session?.user?.id  // ✅ FIX: Fallback auth para operaciones largas
            })
          })

          if (!scrapeRes.ok) {
            console.warn('Advertencia en scraping automático')
          } else {
            const scrapeData = await scrapeRes.json()
            console.log('✅ Scraping automático completado')

            // Mostrar alerta si hubo noticias fallidas
            if (scrapeData.noticias_fallidas > 0) {
              setScrapingAlert({
                total: newsToScrape.length,
                exitosos: scrapeData.noticias_procesadas,
                fallidos: scrapeData.noticias_fallidas,
                errores: scrapeData.errores || []
              })
            } else {
              setScrapingAlert(null)
            }
          }
        }
      } catch (e) {
        console.error('Error en scraping automático:', e)
      } finally {
        setIsPreProcessing(false)
      }
    }

    // Generar noticiero
    const result = await generateNewscast({
      region: selectedRegion,
      radioName: selectedRadio,  // ✅ NUEVO: Nombre de la radio para la intro
      categories: selectedCategoryIds,
      categoryConfig,
      specificNewsUrls: selectedNewsUrls, // Enviar URLs específicas
      targetDuration: duration * 60,
      // generateAudioNow ya no se usa - audio siempre se genera
      adCount: adCount,
      includeTimeWeather: includeWeather,
      timeStrategy: timeStrategy,
      hora_generacion: timeStrategy === 'scheduled' ? scheduledTime : undefined,  // ✅ NUEVO: Hora programada
      newsTime: new Date().toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      voiceModel: selectedVoice,
      voiceWPM: voiceWPM,
      voiceSettings: {
        speed: voiceConfig.speed,
        pitch: voiceConfig.pitch,
        volume: voiceConfig.volume,
        fmRadioEffect: voiceConfig.fmRadioEffect,
        fmRadioIntensity: voiceConfig.fmRadioIntensity
      },
      audioConfig: {
        cortinas_enabled: cortinasEnabled,
        cortinas_frequency: cortinasFrequency,
        cortina_default_id: null,
        cortina_default_url: null,
        background_music_enabled: false,
        background_music_id: null,
        background_music_volume: 0.2
      },
      userId: session?.user?.id  // ✅ NUEVO: Para fallback cuando sesión expira
    } as any)

    // Si fue exitoso, navegar al timeline
    if (result.success && result.newscastId) {
      setTimeout(() => {
        navigateToTimeline(result.newscastId!)
      }, 1500)
    }
  }

  // Guardar plantilla en la base de datos
  const handleSave = async () => {
    if (!selectedRegion || !selectedRadio) {
      toast.warning('Por favor selecciona región y radio antes de guardar')
      return
    }

    const selectedCategoryLabels = categories
      .filter(c => c.checked)
      .map(c => c.label)

    const payload = {
      name: `Plantilla ${selectedRegion} - ${new Date().toLocaleDateString('es-CL')}`,
      region: selectedRegion,
      radio_station: selectedRadio,
      duration_minutes: duration,
      voice_provider: 'local-tts',
      voice_id: selectedVoice,
      include_weather: includeWeather,
      include_time: timeStrategy !== 'none',
      ad_frequency: adCount,
      categories: selectedCategoryLabels,
      configuration: {
        adCount: adCount,
        timeStrategy: timeStrategy,
        cortinas_enabled: cortinasEnabled,
        cortinas_frequency: cortinasFrequency
      }
    }

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        toast.success('✅ Plantilla guardada exitosamente')
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (error) {
      console.error('Error guardando plantilla:', error)
      toast.error('Error al guardar la plantilla')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Crear Noticiero
          </h1>
          <p className="text-gray-600">
            Configura y genera tu noticiero personalizado con IA
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de Configuración */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Región y Radio */}
            <Card>
              <CardHeader>
                <CardTitle>1. Selecciona Región y Radio</CardTitle>
              </CardHeader>
              <CardContent>
                <RegionSelector
                  selectedRegion={selectedRegion}
                  selectedRadio={selectedRadio}
                  onRegionChange={setSelectedRegion}
                  onRadioChange={setSelectedRadio}
                  regions={regions}
                  radios={radioStations}
                />
              </CardContent>
            </Card>

            {/* 2. Escanear Fuentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    2. Escanear Fuentes
                  </span>
                  {hasScanned && (
                    <span className="flex items-center gap-1 text-sm font-normal text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {scannedNews.length} noticias encontradas
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Escanea las páginas principales de tus fuentes suscritas para ver qué noticias están disponibles.
                </p>

                <div className="mb-6">
                  {loadingSources ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-3 w-3 animate-spin" /> Cargando fuentes...
                    </div>
                  ) : availableSources.length > 0 ? (
                    <div className="space-y-3">
                      {/* Resumen de fuentes seleccionadas */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <Newspaper className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">
                            {selectedSourceIds.length} fuente{selectedSourceIds.length !== 1 ? 's' : ''} seleccionada{selectedSourceIds.length !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({availableSources.filter(s => selectedSourceIds.includes(s.id)).map(s => s.nombre_fuente).join(', ')})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAllSources(!showAllSources)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {showAllSources ? 'Ocultar' : 'Modificar fuentes'}
                        </button>
                      </div>

                      {/* Panel expandible para modificar fuentes */}
                      {showAllSources && (
                        <div className="p-3 bg-white border rounded-lg space-y-3">
                          <p className="text-xs text-gray-500">
                            Haz clic en una fuente para seleccionar/deseleccionar:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {availableSources.map(source => {
                              const sourceRegion = source.region || 'Nacional'
                              const isSelected = selectedSourceIds.includes(source.id)
                              const isRelevant = !selectedRegion ||
                                sourceRegion.toLowerCase() === 'nacional' ||
                                sourceRegion.toLowerCase() === selectedRegion.toLowerCase()

                              return (
                                <div
                                  key={source.id}
                                  onClick={() => {
                                    setSelectedSourceIds(prev =>
                                      prev.includes(source.id)
                                        ? prev.filter(id => id !== source.id)
                                        : [...prev, source.id]
                                    )
                                  }}
                                  className={`
                                    cursor-pointer px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                                    ${isSelected
                                      ? 'bg-blue-100 border-blue-400 text-blue-700'
                                      : isRelevant
                                        ? 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        : 'bg-gray-50 border-gray-100 text-gray-400'}
                                  `}
                                  title={`Región: ${sourceRegion}`}
                                >
                                  {source.nombre_fuente}
                                  {sourceRegion.toLowerCase() !== 'nacional' && (
                                    <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-gray-100 text-gray-500">
                                      {sourceRegion.substring(0, 3)}
                                    </span>
                                  )}
                                  {isSelected && <span className="ml-1">✓</span>}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No se encontraron fuentes asociadas a tu cuenta.</p>
                  )}
                  {selectedSourceIds.length === 0 && availableSources.length > 0 && (
                    <p className="text-xs text-red-500 mt-2">⚠️ Debes seleccionar al menos una fuente</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleScanSources}
                    disabled={isScanning || selectedSourceIds.length === 0 || !selectedRegion}
                    className="flex items-center gap-2"
                    variant={hasScanned ? "outline" : "default"}
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Escaneando...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        {hasScanned ? 'Escanear de Nuevo' : 'Escanear Mis Fuentes'}
                      </>
                    )}
                  </Button>

                  {hasScanned && totalNewsSelected > 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-600 font-medium px-3 py-2 bg-green-50 rounded-md border border-green-200">
                      <CheckCircle className="h-4 w-4" />
                      {totalNewsSelected} noticias seleccionadas
                    </div>
                  )}
                </div>

                {scanError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    ⚠️ {scanError}
                  </div>
                )}

                {!hasScanned && !selectedRegion && (
                  <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 text-sm">
                    ⚠️ Primero selecciona una región para escanear fuentes.
                  </div>
                )}

                {!hasScanned && selectedRegion && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                    💡 Escanea tus fuentes para ver las noticias disponibles.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3. Categorías - Solo visible después de escanear */}
            {hasScanned && scannedNews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>3. Selección de Noticias por Categoría</span>
                    {(loadingStats || isScanning) && (
                      <span className="text-sm font-normal text-blue-600 animate-pulse">
                        {isScanning ? 'Escaneando...' : 'Cargando...'}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CategorySelector
                    categories={categories}
                    onCategoryChange={handleCategoryChange}
                    onOpenNewsModal={handleOpenModal}
                    showCounts={true}
                    maxPerCategory={10}
                  />

                  {hasScanned && totalNewsSelected > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                      <p>
                        ✨ <strong>{totalNewsSelected}</strong> noticias seleccionadas.
                        Al generar el noticiero, el sistema descargará el contenido automáticamente.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Alerta de Scraping Fallido */}
            {scrapingAlert && scrapingAlert.fallidos > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start">
                  <span className="text-amber-600 mr-3">⚠️</span>
                  <div className="flex-1">
                    <p className="font-medium text-amber-800">
                      {scrapingAlert.exitosos}/{scrapingAlert.total} noticias procesadas
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      {scrapingAlert.fallidos} noticia(s) no pudieron ser scrapeadas y no se incluirán en el noticiero.
                    </p>
                    {scrapingAlert.errores.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-amber-600 cursor-pointer">Ver detalles</summary>
                        <ul className="text-xs text-amber-600 mt-1 space-y-1">
                          {scrapingAlert.errores.slice(0, 3).map((err, i) => (
                            <li key={i}>• {err}</li>
                          ))}
                          {scrapingAlert.errores.length > 3 && (
                            <li>...y {scrapingAlert.errores.length - 3} más</li>
                          )}
                        </ul>
                      </details>
                    )}
                    <button
                      onClick={() => setScrapingAlert(null)}
                      className="text-xs text-amber-600 underline mt-2"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Duración y Estimación */}
            <Card>
              <CardHeader>
                <CardTitle>4. Duración del Noticiero</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DurationSlider
                  duration={duration}
                  onDurationChange={setDuration}
                  min={5}
                  max={60}
                  selectedNewsCount={totalNewsSelected}
                  voiceWPM={voiceWPM}
                  voiceSpeed={voiceConfig.speed}
                />

              </CardContent>
            </Card>

            {/* 5. Configuración de Publicidad */}
            <Card>
              <CardHeader>
                <CardTitle>5. Configuración de Publicidad</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-700">
                      Cantidad de Anuncios a Insertar
                    </label>
                    <span className="text-2xl font-bold text-blue-600">
                      {adCount}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={adCount}
                    onChange={(e) => setAdCount(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0 anuncios</span>
                    <span>10 anuncios</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Se distribuirán equitativamente durante el noticiero.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 4. Opciones Avanzadas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Opciones Avanzadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-4">
                    <VoiceSelector
                      value={selectedVoice}
                      onChange={(voiceId, wpm) => {
                        setSelectedVoice(voiceId)
                        if (wpm) setVoiceWPM(wpm)
                      }}
                    />
                    <VoiceConfig
                      settings={voiceConfig}
                      onChange={setVoiceConfig}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Hora del Noticiero</label>
                      <select
                        className="w-full border rounded-md p-2"
                        value={timeStrategy}
                        onChange={(e) => setTimeStrategy(e.target.value)}
                      >
                        <option value="auto">Automática (Al generar)</option>
                        <option value="scheduled">Hora Programada</option>
                        <option value="none">No incluir hora</option>
                      </select>
                      {timeStrategy === 'scheduled' && (
                        <div className="mt-2">
                          <label className="text-xs text-gray-500">Hora de emisión:</label>
                          <input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="w-full border rounded-md p-2 mt-1"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 mt-8">
                      <input
                        type="checkbox"
                        id="weather-manual"
                        checked={includeWeather}
                        onChange={(e) => setIncludeWeather(e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <label htmlFor="weather-manual" className="text-sm font-medium text-gray-700">Incluir Clima</label>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-green-600">✓</span>
                      <div>
                        <p className="font-medium text-gray-900">Duración con Compensación</p>
                        <p className="text-sm text-gray-600">
                          El sistema ajusta automáticamente cada noticia para cumplir el tiempo objetivo.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 5. Configuración de Audio */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Music className="h-5 w-5 mr-2" />
                  Configuración de Audio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Toggle Cortinas */}
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div>
                      <Label className="font-medium">Insertar cortinas automáticamente</Label>
                      <p className="text-sm text-gray-500">
                        La IA insertará cortinas entre noticias
                      </p>
                    </div>
                    <Switch
                      checked={cortinasEnabled}
                      onCheckedChange={setCortinasEnabled}
                    />
                  </div>

                  {cortinasEnabled && (
                    <div className="space-y-2 pl-3 border-l-2 border-purple-200">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-700">
                          Frecuencia de cortinas
                        </label>
                        <span className="text-sm font-bold text-purple-600">
                          Cada {cortinasFrequency} noticias
                        </span>
                      </div>
                      <DurationSlider
                        duration={cortinasFrequency}
                        onDurationChange={setCortinasFrequency}
                        min={2}
                        max={10}
                        step={1}
                      />
                      <p className="text-xs text-gray-500">
                        Sube cortinas en la sección Bibliotecas para usarlas.
                      </p>
                    </div>
                  )}

                  <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    <p>🎵 <strong>Música de fondo:</strong> Se configura en el timeline después de generar.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel de Acciones */}
          <div className="space-y-6">
            {/* Resumen */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Región:</span>
                  <span className="font-medium">
                    {selectedRegion || 'No seleccionada'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Radio:</span>
                  <span className="font-medium">
                    {selectedRadio || 'No seleccionada'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Categorías:</span>
                  <span className="font-medium">
                    {categories.filter(c => c.checked).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Duración:</span>
                  <span className="font-medium">{duration} min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Audio:</span>
                  <span className="font-medium">
                    Genera en Finalizar
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Botón de Generar */}
            <GenerateButton
              isGenerating={isGenerating || isPreProcessing}
              progress={progress}
              status={isPreProcessing ? 'Obteniendo contenido...' : status} // Mostrar status de pre-procesamiento
              error={error}
              onGenerate={handleGenerate}
              disabled={!selectedRegion || !selectedRadio || isPreProcessing}
            />

            {/* Botón de Guardar Plantilla */}
            <Button
              onClick={handleSave}
              variant="outline"
              className="w-full"
              disabled={!selectedRegion || !selectedRadio}
            >
              <Save className="mr-2 h-4 w-4" />
              Guardar como Plantilla
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Selección manual de noticias */}
      <NewsSelectionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        category={activeCategory}
        news={scannedNews.filter(n => n.categoria === activeCategory)}
        selectedUrls={selectedNewsUrls}
        onToggleNews={handleToggleNews}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
      />

    </div>
  )
}
