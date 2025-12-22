'use client'

export const dynamic = 'force-dynamic'

import { toast } from 'react-toastify'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabaseUser } from '@/hooks/use-supabase-user'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Download,
  CheckCircle,
  Loader2,
  Trash2
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { NewsCard } from './components/NewsCard'
import { SortableNewsCard } from './components/SortableNewsCard'
import { SelectionControls } from './components/SelectionControls'
import { AddNewsModal } from './components/AddNewsModal'
import { AddAdModal } from './components/AddAdModal'
import { AddAudioModal } from './components/AddAudioModal'
import { BackgroundMusicConfig } from './components/BackgroundMusicConfig'
import { BackgroundMusicBar } from './components/BackgroundMusicBar'
import { GenerateAudioButton } from './components/GenerateAudioButton'
import { TimelineSummary } from './components/TimelineSummary'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/**
 * Transforma URLs de audio para que funcionen en producción
 * En producción, los archivos en /public creados después del build 
 * no son accesibles directamente, así que los servimos via API route
 */
function getAudioUrl(originalUrl: string | undefined): string {
  if (!originalUrl) return ''

  // Si ya es una URL externa o de S3, dejar como está
  if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
    return originalUrl
  }

  // Si es una URL local de audio, usar la API route para servirla
  if (originalUrl.startsWith('/audio/') || originalUrl.startsWith('/generated-audio/')) {
    return `/api/audio?file=${encodeURIComponent(originalUrl)}`
  }

  // Otros casos: devolver original
  return originalUrl
}
interface NewsItem {
  id: string
  title: string
  content: string
  type?: string
  category?: string
  duration: number
  audioUrl?: string
  versions?: {
    original: string
    rewritten?: string
    humanized?: string
  }
  activeVersion?: 'original' | 'rewritten' | 'humanized'
}

interface TimelineData {
  timeline: NewsItem[]
  metadata: {
    totalDuration: number
    targetDuration: number
    newsCount: number
    region: string
    generatedAt: string
  }
}

interface Newscast {
  id: string
  titulo?: string
  region?: string
  estado: string
  duracion_segundos?: number
  datos_timeline: any
  url_audio?: string
  created_at: string
}

export default function TimelineNoticiero({ params }: { params: { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session, isLoading: isLoadingAuth } = useSupabaseUser()
  const status = isLoadingAuth ? 'loading' : (session ? 'authenticated' : 'unauthenticated')
  const [newscast, setNewscast] = useState<Newscast | null>(null)
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationStatus, setGenerationStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedNewsIds, setSelectedNewsIds] = useState<string[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAdModal, setShowAdModal] = useState(false)
  const [showAudioModal, setShowAudioModal] = useState(false)
  const [showMusicConfig, setShowMusicConfig] = useState(false)
  const [backgroundMusic, setBackgroundMusic] = useState<{ url: string | null; volume: number; config: { mode: 'global' | 'range'; fromNews?: number; toNews?: number } | null }>({
    url: null,
    volume: 0.2,
    config: null
  })
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; newsId: string | null; newsTitle: string }>({
    open: false,
    newsId: null,
    newsTitle: ''
  })
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)

  // Timeline is read-only during audio generation or after audio is complete
  const isReadOnly = isGeneratingAudio || !!newscast?.url_audio

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Cargar datos del noticiero o generar si es temporal
  useEffect(() => {
    const loadOrGenerateNewscast = async () => {
      // Esperar a que la sesión cargue
      if (status === 'loading') return

      const isTemp = params.id.startsWith('temp_')
      const source = searchParams.get('source')
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)

      console.log('🔍 ID:', params.id, '| isTemp:', isTemp, '| source:', source, '| isUuid:', isUuid)

      // Si es temporal, generar noticiero
      if (isTemp && source === 'plantilla') {
        try {
          setLoading(true)
          setIsGenerating(true)
          setError(null)
          setGenerationStatus('Cargando configuración...')
          setGenerationProgress(10)

          const configStr = localStorage.getItem('newscast_search_config')
          if (!configStr) {
            throw new Error('No se encontró la configuración del noticiero')
          }

          const config = JSON.parse(configStr)
          console.log('📋 Configuración:', config)

          setGenerationStatus('Generando noticiero...')
          setGenerationProgress(30)

          const response = await fetch('/api/generate-newscast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              region: config.region,
              categories: ['regionales', 'nacionales'],
              targetDuration: (config.duration?.[0] || 15) * 60,
              generateAudioNow: false,
              frecuencia_anuncios: 2,
              includeTimeWeather: true,
              newsTime: new Date().toLocaleTimeString('es-CL', {
                hour: '2-digit',
                minute: '2-digit'
              }),
              voiceModel: config.voice || 'default',
              selectedSources: config.selectedSources || [],
              sourceNewsCount: config.sourceNewsCount || {}
            })
          })

          setGenerationProgress(70)
          setGenerationStatus('Procesando respuesta...')

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Error ${response.status}: ${errorText}`)
          }

          const data = await response.json()

          if (!data.success || !data.newscastId) {
            throw new Error(data.error || 'Error al generar noticiero')
          }

          setGenerationProgress(100)
          setGenerationStatus('¡Noticiero generado!')

          console.log('✅ Noticiero generado:', data.newscastId)
          setTimeout(() => {
            router.replace(`/timeline-noticiero/${data.newscastId}`)
          }, 1000)

        } catch (err) {
          console.error('❌ Error generando:', err)
          setError(err instanceof Error ? err.message : 'Error desconocido')
          setLoading(false)
          setIsGenerating(false)
        }
        return
      }

      // Si NO es temporal, cargar desde DB
      try {
        setLoading(true)
        setError(null)

        let data;

        if (isUuid) {
          // Carga normal por ID
          console.log('📥 Cargando noticiero por ID:', params.id)
          const { data: newsData, error: fetchError } = await supabase
            .from('noticieros')
            .select('*')
            .eq('id', params.id)
            .single()

          if (fetchError) throw fetchError
          data = newsData
        } else {
          // Intentar cargar el último noticiero del usuario para la región especificada
          const regionName = decodeURIComponent(params.id)
          console.log('📥 Buscando último noticiero para región:', regionName)

          if (!session?.user?.id) {
            // Si no hay sesión, no podemos buscar por usuario
            console.log('⚠️ Usuario no autenticado (NextAuth)')
            throw new Error('Debes iniciar sesión para ver tus noticieros')
          }

          const { data: newsData, error: fetchError } = await supabase
            .from('noticieros')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('region', regionName)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (fetchError) {
            if (fetchError.code === 'PGRST116') { // Código de "no rows returned"
              throw new Error(`No tienes noticieros creados para la región: ${regionName}`)
            }
            throw fetchError
          }
          data = newsData
        }

        if (!data) throw new Error('Noticiero no encontrado')

        console.log('✅ Noticiero cargado:', data)
        setNewscast(data)

        let timelineRaw = data.datos_timeline
        if (typeof timelineRaw === 'string') {
          timelineRaw = JSON.parse(timelineRaw)
        }

        // Helper para asegurar IDs únicos
        const ensureUniqueIds = (items: any[]): NewsItem[] => {
          const seenIds = new Set<string>()
          return items.map((item: any, index: number) => {
            let id = item.id || `item-${index}`

            // Si el ID ya existe, hacerlo único agregando el índice
            if (seenIds.has(id)) {
              console.warn(`⚠️ ID duplicado encontrado: ${id}, creando ID único`)
              id = `${id}_${index}_${Date.now()}`
            }
            seenIds.add(id)

            return {
              id,
              title: item.title || item.titulo || 'Sin título',
              content: item.content || item.contenido || '',
              type: item.type || item.tipo || 'news',
              category: item.category || item.categoria || 'general',
              duration: item.duration || item.duracion || 30,
              audioUrl: item.audioUrl || item.url_audio,
              versions: item.versions,
              activeVersion: item.activeVersion
            }
          })
        }

        let normalized: TimelineData
        if (Array.isArray(timelineRaw)) {
          normalized = {
            timeline: ensureUniqueIds(timelineRaw),
            metadata: {
              totalDuration: data.duracion_segundos || 0,
              targetDuration: data.duracion_segundos || 900,
              newsCount: timelineRaw.length,
              region: data.region || 'Sin región',
              generatedAt: data.created_at
            }
          }
        } else if (timelineRaw?.timeline) {
          // Asegurar que metadata exista, si no, crearla con defaults
          normalized = {
            timeline: ensureUniqueIds(timelineRaw.timeline),
            metadata: timelineRaw.metadata || {
              totalDuration: data.duracion_segundos || 0,
              targetDuration: data.duracion_segundos || 900,
              newsCount: timelineRaw.timeline.length,
              region: data.region || 'Sin región',
              generatedAt: data.created_at
            }
          }
        } else {
          throw new Error('Formato de datos inválido')
        }

        // Debug: verificar IDs únicos
        const allIds = normalized.timeline.map(item => item.id)
        const uniqueIds = new Set(allIds)
        if (allIds.length !== uniqueIds.size) {
          console.error('❌ Hay IDs duplicados en el timeline:', allIds)
        } else {
          console.log('✅ Todos los IDs son únicos:', allIds.length, 'items')
        }

        setTimelineData(normalized)
        console.log('✅ Timeline normalizado', normalized)

        // Cargar configuración de música de fondo si existe
        if (data.background_music_url) {
          setBackgroundMusic({
            url: data.background_music_url,
            volume: data.background_music_volume ?? 0.2,
            config: data.background_music_config || null
          })
          console.log('🎵 Música de fondo cargada:', data.background_music_url)
        }

      } catch (err) {
        console.error('❌ Error cargando:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    loadOrGenerateNewscast()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, status, session?.user?.id])

  // --- Handlers para actualizar el estado y la BD ---

  const saveTimelineToDB = async (newTimeline: NewsItem[]) => {
    if (!newscast?.id) return

    try {
      // Recalcular duración total
      const totalDuration = newTimeline.reduce((acc, item) => acc + (item.duration || 0), 0)

      const { error } = await supabase
        .from('noticieros')
        .update({
          datos_timeline: { ...timelineData, timeline: newTimeline, metadata: { ...timelineData?.metadata, totalDuration } },
          duracion_segundos: totalDuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', newscast.id)

      if (error) throw error
      console.log('💾 Timeline guardado en BD')
    } catch (err) {
      console.error('❌ Error guardando timeline:', err)
      toast.error('Error al guardar cambios')
    }
  }

  const handleUpdateContent = async (id: string, newContent: string, version: string) => {
    if (!timelineData) return

    const newTimeline = timelineData.timeline.map(item => {
      if (item.id === id) {
        return {
          ...item,
          content: newContent,
          activeVersion: version as any,
          // Si cambiamos contenido, el audio actual ya no es válido
          // Opcional: borrar audioUrl o mantenerlo hasta regenerar
        }
      }
      return item
    })

    setTimelineData({ ...timelineData, timeline: newTimeline })
    await saveTimelineToDB(newTimeline)
  }

  const handleUpdateAudio = async (id: string, audioUrl: string, duration: number) => {
    if (!timelineData) return

    const newTimeline = timelineData.timeline.map(item => {
      if (item.id === id) {
        return { ...item, audioUrl, duration }
      }
      return item
    })

    // Recalcular metadata localmente también
    const totalDuration = newTimeline.reduce((acc, item) => acc + (item.duration || 0), 0)

    setTimelineData({
      ...timelineData,
      timeline: newTimeline,
      metadata: { ...timelineData.metadata, totalDuration }
    })

    await saveTimelineToDB(newTimeline)
  }

  const handleDeleteNews = async (id: string) => {
    if (!timelineData) return

    // Encontrar la noticia para mostrar su título en el modal
    const newsToDelete = timelineData.timeline.find(item => item.id === id)
    setDeleteConfirm({
      open: true,
      newsId: id,
      newsTitle: newsToDelete?.title || 'esta noticia'
    })
  }

  const confirmDeleteNews = async () => {
    if (!timelineData || !deleteConfirm.newsId) return

    const newTimeline = timelineData.timeline.filter(item => item.id !== deleteConfirm.newsId)

    // Recalcular metadata
    const totalDuration = newTimeline.reduce((acc, item) => acc + (item.duration || 0), 0)

    setTimelineData({
      ...timelineData,
      timeline: newTimeline,
      metadata: { ...timelineData.metadata, totalDuration, newsCount: newTimeline.length }
    })

    await saveTimelineToDB(newTimeline)
    setSelectedNewsIds(prev => prev.filter(newsId => newsId !== deleteConfirm.newsId))
    setDeleteConfirm({ open: false, newsId: null, newsTitle: '' })
    toast.success('Noticia eliminada')
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id && timelineData) {
      const oldIndex = timelineData.timeline.findIndex((item) => item.id === active.id)
      const newIndex = timelineData.timeline.findIndex((item) => item.id === over?.id)

      const newTimeline = arrayMove(timelineData.timeline, oldIndex, newIndex)

      setTimelineData({ ...timelineData, timeline: newTimeline })
      await saveTimelineToDB(newTimeline)
    }
  }

  const handleAddAd = async (ad: any) => {
    if (!timelineData) return

    const newTimeline = [...timelineData.timeline, ad]

    // Recalcular metadata
    const totalDuration = newTimeline.reduce((acc, item) => acc + (item.duration || 0), 0)

    setTimelineData({
      ...timelineData,
      timeline: newTimeline,
      metadata: { ...timelineData.metadata, totalDuration }
    })

    await saveTimelineToDB(newTimeline)
    toast.success('Publicidad agregada')
  }

  // --- Funciones de selección ---
  const toggleNewsSelection = (newsId: string) => {
    setSelectedNewsIds(prev =>
      prev.includes(newsId)
        ? prev.filter(id => id !== newsId)
        : [...prev, newsId]
    )
  }

  const selectAll = () => {
    if (!timelineData) return
    // Seleccionar TODOS los items del timeline
    const allIds = timelineData.timeline.map(item => item.id)
    setSelectedNewsIds(allIds)
  }

  const deselectAll = () => {
    setSelectedNewsIds([])
  }

  const reloadTimeline = async () => {
    // Reutilizamos la lógica de carga inicial o simplemente recargamos la página
    window.location.reload()
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading || isGenerating) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            {isGenerating ? (
              <>
                <p className="text-gray-900 font-semibold mb-2">{generationStatus}</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">Generando noticiero desde plantilla...</p>
              </>
            ) : (
              <p className="text-gray-600">Cargando timeline...</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (error || !newscast || !timelineData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{error || 'No se pudo cargar el noticiero'}</p>
              <Button
                onClick={() => router.push('/crear-noticiero')}
                className="mt-4"
                variant="outline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const newsWithAudio = timelineData.timeline.filter(item => item.type === 'news' || !item.type)
  const allSelected = newsWithAudio.length > 0 && selectedNewsIds.length === newsWithAudio.length

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* ... Header y Resumen ... */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/crear-noticiero')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Timeline del Noticiero
              </h1>
              <p className="text-gray-600 mt-1">
                {timelineData.metadata.region} • {timelineData.metadata.newsCount} noticias
              </p>
            </div>
          </div>
          <Badge
            variant={newscast.estado === 'completado' ? 'default' : 'secondary'}
            className="text-sm"
          >
            {newscast.estado}
          </Badge>
        </div>

        <TimelineSummary
          totalDuration={timelineData.metadata.totalDuration}
          targetDuration={timelineData.metadata.targetDuration}
          newsCount={timelineData.metadata.newsCount}
          region={timelineData.metadata.region}
          estado={newscast.estado}
          newscastId={params.id}
          onReload={reloadTimeline}
        />

        {/* Barra de música de fondo */}
        <BackgroundMusicBar
          newsCount={timelineData.metadata.newsCount}
          currentMusicUrl={backgroundMusic.url}
          currentVolume={backgroundMusic.volume}
          currentConfig={backgroundMusic.config}
          disabled={isReadOnly}
          onSave={async (musicUrl, volume, config) => {
            setBackgroundMusic({ url: musicUrl, volume, config })
            // Guardar en BD
            if (newscast) {
              await supabase
                .from('noticieros')
                .update({
                  background_music_url: musicUrl,
                  background_music_volume: volume,
                  background_music_config: config
                })
                .eq('id', newscast.id)
            }
          }}
        />

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Noticias del Timeline</CardTitle>
            <SelectionControls
              selectedCount={selectedNewsIds.length}
              totalCount={newsWithAudio.length}
              allSelected={allSelected}
              onSelectAll={selectAll}
              onDeselectAll={deselectAll}
              onAddNews={() => setShowAddModal(true)}
              onAddAd={() => setShowAdModal(true)}
              onAddAudio={() => setShowAudioModal(true)}
              onConfigureMusic={() => setShowMusicConfig(true)}
              hasMusicConfigured={!!backgroundMusic.url}
              disabled={isReadOnly}
            />
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={timelineData.timeline.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {timelineData.timeline.map((item, index) => (
                    <SortableNewsCard
                      key={item.id}
                      id={item.id}
                      news={item}
                      index={index}
                      selected={selectedNewsIds.includes(item.id)}
                      onToggleSelection={toggleNewsSelection}
                      onUpdateContent={handleUpdateContent}
                      onUpdateAudio={handleUpdateAudio}
                      onDelete={handleDeleteNews}
                      disabled={isReadOnly}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>

        {newscast.url_audio && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <CheckCircle className="mr-2 h-5 w-5" />
                Audio Final Generado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <audio controls className="w-full mb-4">
                <source src={getAudioUrl(newscast.url_audio)} type="audio/mpeg" />
              </audio>
              <Button
                variant="outline"
                onClick={() => window.open(getAudioUrl(newscast.url_audio), '_blank')}
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar MP3
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          {!newscast.url_audio && (
            <GenerateAudioButton
              newscastId={params.id}
              selectedNewsIds={selectedNewsIds}
              disabled={selectedNewsIds.length === 0}
              targetDuration={timelineData.metadata.targetDuration}
              onSuccess={(audioUrl) => {
                setNewscast(prev => prev ? { ...prev, url_audio: audioUrl, estado: 'completado' } : null)
              }}
              onGeneratingChange={setIsGeneratingAudio}
            />
          )}

          <Button
            variant="outline"
            onClick={() => router.push('/crear-noticiero')}
          >
            Crear Nuevo Noticiero
          </Button>
        </div>
      </div>

      <AddNewsModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        region={timelineData.metadata.region}
        newscastId={params.id}
        onNewsAdded={reloadTimeline}
      />

      <AddAdModal
        open={showAdModal}
        onOpenChange={setShowAdModal}
        onAddAd={handleAddAd}
      />

      <AddAudioModal
        open={showAudioModal}
        onOpenChange={setShowAudioModal}
        onAddAudio={handleAddAd}
      />

      <BackgroundMusicConfig
        open={showMusicConfig}
        onOpenChange={setShowMusicConfig}
        currentMusicUrl={backgroundMusic.url}
        currentVolume={backgroundMusic.volume}
        onSave={async (musicUrl, volume) => {
          setBackgroundMusic({ url: musicUrl, volume, config: backgroundMusic.config })
          // Guardar en la BD
          if (newscast) {
            const { error } = await supabase
              .from('noticieros')
              .update({
                background_music_url: musicUrl,
                background_music_volume: volume
              })
              .eq('id', newscast.id)
            if (error) {
              console.error('Error guardando música de fondo:', error)
            }
          }
        }}
      />

      {/* Modal de confirmación de eliminación */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, newsId: null, newsTitle: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Eliminar noticia
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar <strong>"{deleteConfirm.newsTitle}"</strong>?
              <br />
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteNews}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
