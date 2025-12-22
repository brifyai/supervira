'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Clock, Globe, AlertCircle, RefreshCw, Calendar, MapPin, Eye, Play, Mic, Radio } from 'lucide-react'
import { toast } from 'react-toastify'
import { BreakingNewsCard } from '@/components/ultimo-minuto/breaking-news-card'
import { UrgentFilters } from '@/components/ultimo-minuto/urgent-filters'
import { VoiceSelector } from '@/components/newscast/VoiceSelector'
import { supabase } from '@/lib/supabase'

interface RadioStation {
  id: string
  nombre: string
  region: string
}

interface BreakingNews {
  id: string
  title: string
  summary: string
  content: string
  source: string
  url: string
  publishedAt: string
  region: string
  category: string
  urgency: 'low' | 'medium' | 'high'
  sentiment: 'positive' | 'negative' | 'neutral'
}

export default function UltimoMinutoPage() {
  const [breakingNews, setBreakingNews] = useState<BreakingNews[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTime, setSelectedTime] = useState('24') // 24 horas por defecto
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedNews, setSelectedNews] = useState<BreakingNews[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [regions, setRegions] = useState<string[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>('')
  const [voiceWPM, setVoiceWPM] = useState<number>(150)

  // Estados para radios
  const [radioStations, setRadioStations] = useState<RadioStation[]>([])
  const [selectedRadio, setSelectedRadio] = useState<string>('')
  const [loadingRadios, setLoadingRadios] = useState(true)

  // Cargar radios desde API (multi-tenant)
  useEffect(() => {
    const loadRadios = async () => {
      try {
        setLoadingRadios(true)
        const response = await fetch('/api/radios')
        const data = await response.json()

        if (data.radios && data.radios.length > 0) {
          setRadioStations(data.radios)
          // Seleccionar primera radio por defecto
          setSelectedRadio(data.radios[0].id)
        }
      } catch (error) {
        console.error('Error cargando radios:', error)
      } finally {
        setLoadingRadios(false)
      }
    }
    loadRadios()
  }, [])

  // Obtener región de la radio seleccionada
  const getSelectedRadioRegion = (): string => {
    const radio = radioStations.find(r => r.id === selectedRadio)
    return radio?.region || 'Nacional'
  }

  // Cargar regiones activas
  useEffect(() => {
    const loadRegions = async () => {
      const { data, error } = await supabase
        .from('configuraciones_regiones')
        .select('region')
        .eq('esta_activo', true)
        .order('region')

      if (data) {
        setRegions(data.map(r => r.region))
      }
    }
    loadRegions()
  }, [])

  // Función para obtener noticias de último minuto (desde API propia)
  const fetchBreakingNews = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/breaking-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeFrame: parseInt(selectedTime),
          region: selectedRegion,
          category: selectedCategory,
          urgentOnly: false // Traer todas, el filtro visual lo hace el usuario si quiere
        }),
      })

      const data = await response.json()

      if (data.success) {
        setBreakingNews(data.news || [])
        setLastUpdate(new Date())
        if (data.news?.length > 0) {
          toast.success(`${data.news.length} noticias encontradas`, { toastId: 'news-found' })
        } else {
          toast.info('No se encontraron noticias recientes', { toastId: 'no-news' })
        }
      } else {
        toast.error('Error al obtener noticias: ' + (data.error || 'Error desconocido'), { toastId: 'news-error' })
        setBreakingNews([])
      }
    } catch (error) {
      console.error('Error fetching breaking news:', error)
      toast.error('Error al conectar con el servidor', { toastId: 'server-error' })
      setBreakingNews([])
    } finally {
      setIsLoading(false)
    }
  }

  // Cargar noticias al cambiar filtros
  useEffect(() => {
    fetchBreakingNews()
  }, [selectedTime, selectedRegion, selectedCategory])

  // Auto-refresh
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (autoRefresh) {
      interval = setInterval(fetchBreakingNews, 5 * 60 * 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, selectedTime, selectedRegion, selectedCategory])

  // Manejar selección de noticias
  const toggleNewsSelection = (news: BreakingNews) => {
    setSelectedNews(prev => {
      const isSelected = prev.some(n => n.id === news.id)
      if (isSelected) {
        return prev.filter(n => n.id !== news.id)
      } else {
        return [...prev, news]
      }
    })
  }

  // Generar noticiero urgente
  const generateUrgentNewscast = async () => {
    const newsToUse = selectedNews.length > 0 ? selectedNews : breakingNews

    if (newsToUse.length === 0) {
      toast.error('No hay noticias para generar el noticiero', { toastId: 'no-news-generate' })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/generate-urgent-newscast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          news: newsToUse,
          timeFrame: selectedTime,
          region: getSelectedRadioRegion(),
          priority: 'urgent',
          voiceModel: selectedVoice || 'default',
          voiceWPM: voiceWPM || 150,
          radioId: selectedRadio
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Noticiero generado exitosamente', { toastId: 'newscast-success' })
        window.location.href = `/timeline-noticiero/${data.report_id}?urgent=true`
      } else {
        toast.error('Error al generar noticiero: ' + (data.error || 'Error desconocido'), { toastId: 'newscast-error' })
      }
    } catch (error) {
      console.error('Error generating urgent newscast:', error)
      toast.error('Error al generar el noticiero', { toastId: 'newscast-generate-error' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Cobertura de Último Minuto</h1>
                <p className="text-gray-600">Noticias urgentes y de alta importancia en tiempo real</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {lastUpdate && (
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  Actualizado: {lastUpdate.toLocaleTimeString('es-CL')}
                </div>
              )}

              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto-actualizar
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <UrgentFilters
            selectedTime={selectedTime}
            selectedRegion={selectedRegion}
            selectedCategory={selectedCategory}
            onTimeChange={setSelectedTime}
            onRegionChange={setSelectedRegion}
            onCategoryChange={setSelectedCategory}
            onSearch={fetchBreakingNews}
            isLoading={isLoading}
            newsCount={breakingNews.length}
            // Pasamos las regiones cargadas dinámicamente
            availableRegions={regions}
          />

          {/* Barra de acciones */}
          {breakingNews.length > 0 && (
            <Card className="mb-6">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      {breakingNews.length} noticias encontradas
                    </Badge>

                    {selectedNews.length > 0 && (
                      <Badge variant="default" className="text-lg px-4 py-2 bg-blue-100 text-blue-800">
                        {selectedNews.length} seleccionadas
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Selector de radio */}
                    <div className="w-48">
                      <select
                        value={selectedRadio}
                        onChange={(e) => setSelectedRadio(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loadingRadios}
                      >
                        {loadingRadios ? (
                          <option>Cargando...</option>
                        ) : radioStations.length === 0 ? (
                          <option>Sin radios</option>
                        ) : (
                          radioStations.map(radio => (
                            <option key={radio.id} value={radio.id}>
                              🔘 {radio.nombre} ({radio.region})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* Selector de voz */}
                    <div className="w-48">
                      <VoiceSelector
                        value={selectedVoice}
                        onChange={(voiceId, wpm) => {
                          setSelectedVoice(voiceId)
                          if (wpm) setVoiceWPM(wpm)
                        }}
                      />
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setSelectedNews([])}
                      disabled={selectedNews.length === 0}
                    >
                      Limpiar Selección
                    </Button>

                    <Button
                      onClick={generateUrgentNewscast}
                      disabled={isLoading || breakingNews.length === 0}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {selectedNews.length > 0
                        ? `Generar con ${selectedNews.length} Seleccionadas`
                        : `Generar con Todas (${breakingNews.length})`
                      }
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Lista de Noticias */}
        <div className="space-y-4">
          {isLoading && breakingNews.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 mx-auto text-gray-400 animate-spin mb-4" />
                  <p className="text-gray-600">Cargando noticias...</p>
                </div>
              </CardContent>
            </Card>
          ) : breakingNews.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay noticias recientes</h3>
                  <p className="text-gray-600 mb-4">
                    Intenta cambiar los filtros de tiempo o región.
                  </p>
                  <Button onClick={fetchBreakingNews} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {breakingNews.map((news) => (
                <BreakingNewsCard
                  key={news.id}
                  news={news}
                  isSelected={selectedNews.some(n => n.id === news.id)}
                  onSelect={() => toggleNewsSelection(news)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
