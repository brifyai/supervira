
'use client'

export const dynamic = 'force-dynamic'

import { toast } from 'react-toastify'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Navigation } from '@/components/navigation'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2, Upload, Globe, UserCheck, Radio } from 'lucide-react'

// Las regiones se cargan dinámicamente desde la tabla configuraciones_regiones

// Interfaz para las fuentes de noticias (usando estructura de API /api/fuentes)
interface NewsSource {
  id: string
  suscripcion_id: string
  nombre_fuente: string
  url: string
  rss_url?: string
  region?: string
  categoria?: string
  esta_activo?: boolean
}

// Interfaz para las radios
interface Radio {
  id: string
  nombre: string
  frecuencia: string
  region: string
  url?: string
}



export default function ActivosPage() {
  const [activeTab, setActiveTab] = useState('fuentes-noticias')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [newsSources, setNewsSources] = useState<NewsSource[]>([])
  const [loading, setLoading] = useState(true)
  const [newSourceName, setNewSourceName] = useState('')
  const [newSourceUrl, setNewSourceUrl] = useState('')
  const [addingSource, setAddingSource] = useState(false)

  // Estados para Regiones (cargadas desde DB)
  const [availableRegions, setAvailableRegions] = useState<string[]>([])
  const [loadingRegions, setLoadingRegions] = useState(true)

  // Estados para Clonación de Voz
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isTrainingVoiceClone, setIsTrainingVoiceClone] = useState(false)

  // Estados para Radios
  const [radios, setRadios] = useState<Radio[]>([])
  const [loadingRadios, setLoadingRadios] = useState(true)
  const [newRadioName, setNewRadioName] = useState('')
  const [newRadioFrequency, setNewRadioFrequency] = useState('')
  const [newRadioRegion, setNewRadioRegion] = useState('')
  const [newRadioUrl, setNewRadioUrl] = useState('')
  const [addingRadio, setAddingRadio] = useState(false)
  const [selectedRadioRegion, setSelectedRadioRegion] = useState<string>('todas')

  // Estados para Clonación de Voz (Actualizado)
  const [voiceName, setVoiceName] = useState('')
  const [clonedVoices, setClonedVoices] = useState<any[]>([])
  const [loadingVoices, setLoadingVoices] = useState(false)

  // Cargar regiones desde la base de datos
  useEffect(() => {
    async function cargarRegiones() {
      setLoadingRegions(true)
      try {
        const { data, error } = await supabase
          .from('configuraciones_regiones')
          .select('region')
          .eq('esta_activo', true)
          .order('region')

        if (error) {
          console.error('Error cargando regiones:', error)
        } else if (data) {
          // Ordenar para que "Nacional" aparezca primero
          const regiones = data.map(r => r.region)
          const ordenadas = regiones.sort((a, b) => {
            if (a === 'Nacional') return -1
            if (b === 'Nacional') return 1
            return a.localeCompare(b, 'es')
          })
          setAvailableRegions(ordenadas)
          console.log('Regiones cargadas desde DB:', ordenadas)
        }
      } catch (error) {
        console.error('Error inesperado cargando regiones:', error)
      } finally {
        setLoadingRegions(false)
      }
    }

    cargarRegiones()
  }, [])

  // Cargar voces clonadas
  useEffect(() => {
    if (activeTab === 'clonacion-voz') {
      fetchClonedVoices()
    }
  }, [activeTab])

  const fetchClonedVoices = async () => {
    setLoadingVoices(true)
    try {
      const response = await fetch('/api/text-to-speech/voices')
      if (response.ok) {
        const data = await response.json()
        // Filtrar solo las voces clonadas (tipo 'cloned')
        // La API ya devuelve las del usuario + sistema, pero aquí queremos mostrar
        // las que el usuario ha gestionado (que vendrán con un flag isUserVoice o simplemente filtramos por type='cloned')
        // En este caso, mostraremos todas las disponibles para clonación que sean de tipo 'cloned'
        // o mejor aún, solo las que sean isUserVoice si queremos mostrar "Mis Voces"
        const voices = data.voices || []
        setClonedVoices(voices.filter((v: any) => v.isUserVoice))
      }
    } catch (error) {
      console.error('Error fetching voices:', error)
    } finally {
      setLoadingVoices(false)
    }
  }



  // Función para obtener fuentes de noticias del usuario
  // Ahora usa el endpoint /api/fuentes con modelo de suscripciones
  useEffect(() => {
    async function obtenerFuentes() {
      setLoading(true)
      try {
        const response = await fetch('/api/fuentes', {
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error('Error al obtener fuentes')
        }

        const result = await response.json()
        console.log('Fuentes cargadas:', result.data)
        setNewsSources(result.data || [])

        // Establecer región por defecto si hay datos
        if (result.data && result.data.length > 0 && !selectedRegion) {
          const regiones = [...new Set(result.data.map((f: any) => f.region))]
          if (regiones.length > 0) {
            setSelectedRegion(regiones[0] as string)
          }
        }
      } catch (error) {
        console.error('Error al obtener fuentes:', error)
        setNewsSources([])
      } finally {
        setLoading(false)
      }
    }

    obtenerFuentes()
  }, [])

  // Función para cargar radios cuando se selecciona la pestaña
  // Ahora usa el endpoint /api/radios que filtra automáticamente por usuario
  const cargarRadios = async () => {
    setLoadingRadios(true)
    try {
      // Usar el endpoint que filtra por user_id automáticamente
      const response = await fetch('/api/radios', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Error al cargar radios')
      }

      const result = await response.json()
      console.log('Radios cargadas:', result.data)
      setRadios(result.data || [])

    } catch (error) {
      console.error('Error al obtener radios:', error)
      setRadios([])
    } finally {
      setLoadingRadios(false)
    }
  }

  // Efecto para cargar radios cuando cambia la pestaña activa
  useEffect(() => {
    if (activeTab === 'radios') {
      cargarRadios()
    }
  }, [activeTab])

  // Función para agregar una nueva radio usando el endpoint
  const handleAddRadio = async () => {
    if (!newRadioName.trim() || !newRadioFrequency.trim() || !newRadioRegion.trim()) {
      toast.warning('Por favor complete los campos obligatorios: Nombre, Frecuencia y Región')
      return
    }

    const newRadioData = {
      nombre: newRadioName.trim(),
      frecuencia: newRadioFrequency.trim(),
      region: newRadioRegion.trim(),
      url: newRadioUrl.trim() || null
    }

    console.log('Agregando nueva radio:', newRadioData)

    setAddingRadio(true)
    try {
      // Usar el endpoint /api/radios que asigna user_id automáticamente
      const response = await fetch('/api/radios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newRadioData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear radio')
      }

      // Recargar lista de radios
      await cargarRadios()

      // Limpiar formulario
      setNewRadioName('')
      setNewRadioFrequency('')
      setNewRadioRegion('')
      setNewRadioUrl('')
      toast.success('Radio agregada exitosamente')
    } catch (error) {
      console.error('Error al agregar radio:', error)
      toast.error(error instanceof Error ? error.message : 'Error al agregar la radio')
    } finally {
      setAddingRadio(false)
    }
  }

  // Función para eliminar una radio usando el endpoint
  const eliminarRadio = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta radio?')) {
      try {
        const response = await fetch(`/api/radios?id=${id}`, {
          method: 'DELETE',
          credentials: 'include'
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error al eliminar radio')
        }

        // Actualizar el estado local
        setRadios((prev: Radio[]) => prev.filter(radio => radio.id !== id))
        toast.success('Radio eliminada exitosamente')
      } catch (error) {
        console.error('Error al eliminar radio:', error)
        toast.error(error instanceof Error ? error.message : 'Error al eliminar la radio')
      }
    }
  }

  // Funciones para Fuentes de Noticias
  // Ahora usa el endpoint /api/fuentes con modelo de suscripciones
  const handleAddSource = async () => {
    if (!selectedRegion) {
      toast.warning('Por favor seleccione una región')
      return
    }

    if (!newSourceName.trim() || !newSourceUrl.trim()) {
      toast.warning('Por favor complete todos los campos')
      return
    }

    if (!newSourceUrl.includes('http')) {
      toast.warning('Por favor ingrese una URL válida (debe incluir http:// o https://)')
      return
    }

    const newSourceData = {
      region: selectedRegion,
      nombre_fuente: newSourceName.trim(),
      url: newSourceUrl.trim(),
      categoria: 'general'
    }

    console.log('Agregando/suscribiendo fuente:', newSourceData)

    setAddingSource(true)
    try {
      // Usar endpoint que crea o suscribe a fuente existente
      const response = await fetch('/api/fuentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newSourceData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al agregar fuente')
      }

      // Recargar lista de fuentes
      const reloadResponse = await fetch('/api/fuentes', { credentials: 'include' })
      if (reloadResponse.ok) {
        const result = await reloadResponse.json()
        setNewsSources(result.data || [])
      }

      setNewSourceName('')
      setNewSourceUrl('')
      toast.success('Fuente agregada exitosamente')
    } catch (error) {
      console.error('Error al agregar fuente:', error)
      toast.error(error instanceof Error ? error.message : 'Error al agregar la fuente')
    } finally {
      setAddingSource(false)
    }
  }





  // Funciones para Clonación de Voz
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const audioFiles = Array.from(files).filter(file =>
        file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav')
      )

      if (audioFiles.length === 0) {
        toast.warning('Por favor seleccione archivos de audio válidos (.mp3, .wav)')
        return
      }

      setUploadedFiles(prev => [...prev, ...audioFiles])
    }
  }

  const handleTrainVoiceClone = async () => {
    if (uploadedFiles.length === 0) {
      toast.warning('Por favor suba un archivo de audio')
      return
    }

    if (!voiceName.trim()) {
      toast.warning('Por favor ingrese un nombre para la voz')
      return
    }

    setIsTrainingVoiceClone(true)
    try {
      const file = uploadedFiles[0] // Tomamos el primer archivo
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', voiceName.trim())

      const response = await fetch('/api/voice-cloning/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Error al subir el archivo')
      }

      toast.success('¡Voz clonada exitosamente! Ya está disponible para usar.')
      setUploadedFiles([])
      setVoiceName('')
      fetchClonedVoices() // Recargar lista

    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al procesar la voz. Intente nuevamente.')
    } finally {
      setIsTrainingVoiceClone(false)
    }
  }

  // Obtener fuentes de la región seleccionada
  const getCurrentSources = () => {
    if (!selectedRegion) return []

    return newsSources
      .filter(source => source.region === selectedRegion)
      .map((source) => ({
        id: source.id,
        suscripcion_id: source.suscripcion_id,
        name: source.nombre_fuente,
        url: source.url
      }))
  }

  const currentSources = getCurrentSources()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation />

        <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Gestionar Activos de la Radio
            </h1>
          </div>

          {/* Tabs */}
          <Card className="bg-white">
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 bg-gray-50 p-1 rounded-none">
                  <TabsTrigger
                    value="fuentes-noticias"
                    className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Fuentes de Noticias
                  </TabsTrigger>
                  <TabsTrigger
                    value="radios"
                    className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
                  >
                    <Radio className="h-4 w-4 mr-2" />
                    Radios
                  </TabsTrigger>
                  {/* Tab Clonación de Voz oculta temporalmente */}
                  {/* <TabsTrigger
                    value="clonacion-voz"
                    className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Clonación de Voz
                  </TabsTrigger> */}
                </TabsList>

                {/* Tab Content: Fuentes de Noticias */}
                <TabsContent value="fuentes-noticias" className="p-6">
                  <div className="space-y-6">
                    {/* Selector de Región */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Seleccionar Región
                      </Label>
                      <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                        <SelectTrigger className="max-w-xs">
                          <SelectValue placeholder="Selecciona una región" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Regiones con fuentes */}
                          {Array.from(new Set(newsSources.map(item => item.region).filter(Boolean))).map(region => {
                            const sourceCount = newsSources.filter(item => item.region === region).length
                            return (
                              <SelectItem key={`with-${region}`} value={region as string}>
                                {region} ({sourceCount} fuentes)
                              </SelectItem>
                            )
                          })}

                          {/* Separador si hay regiones sin fuentes */}
                          {newsSources.length > 0 && availableRegions.some((region: string) =>
                            !newsSources.find(item => item.region === region)
                          ) && (
                              <div key="separator" className="px-2 py-1 text-xs text-gray-500 border-t">
                                Regiones sin fuentes:
                              </div>
                            )}

                          {/* Regiones sin fuentes */}
                          {availableRegions.filter((region: string) =>
                            !newsSources.find(item => item.region === region)
                          ).map((region: string) => (
                            <SelectItem key={`empty-${region}`} value={region}>
                              {region}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Lista de Fuentes */}
                    {selectedRegion && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Fuentes para {selectedRegion}
                        </h3>

                        {loading ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-gray-500 mt-2">Cargando fuentes...</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {currentSources.length > 0 ? (
                              currentSources.map((source) => (
                                <div key={source.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                                  <div>
                                    <h4 className="font-medium text-gray-900">{source.name}</h4>
                                    <a
                                      href={source.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 text-sm hover:underline"
                                    >
                                      {source.url}
                                    </a>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm('¿Estás seguro de que deseas eliminar esta fuente?')) {
                                        supabase
                                          .from('fuentes_final')
                                          .delete()
                                          .eq('id', source.id)
                                          .then(({ error }) => {
                                            if (error) {
                                              toast.error(`Error al eliminar la fuente: ${error.message}`)
                                            } else {
                                              setNewsSources(prev => prev.filter(s => s.id !== source.id))
                                              toast.success('Fuente eliminada exitosamente')
                                            }
                                          })
                                      }
                                    }}
                                    className="h-8 w-8 p-0 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <Globe className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>No hay fuentes configuradas para esta región.</p>
                                <p className="text-sm">Agrega la primera fuente usando el formulario de abajo.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Agregar Nueva Fuente */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Agregar Nueva Fuente{selectedRegion ? ` a ${selectedRegion}` : ''}
                      </h3>

                      {!selectedRegion && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                          <p className="text-yellow-800 text-sm">
                            Por favor selecciona una región antes de agregar una fuente.
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">
                            Nombre del Medio
                          </Label>
                          <div className="relative">
                            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Ej: El Mercurio"
                              value={newSourceName}
                              onChange={(e) => setNewSourceName(e.target.value)}
                              className="pl-10"
                              disabled={!selectedRegion}
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">
                            URL del Sitio Web
                          </Label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400">🔗</div>
                            <Input
                              placeholder="https://..."
                              value={newSourceUrl}
                              onChange={(e) => setNewSourceUrl(e.target.value)}
                              className="pl-10"
                              disabled={!selectedRegion}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Button
                          onClick={handleAddSource}
                          disabled={!selectedRegion || addingSource}
                          className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                        >
                          {addingSource ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Agregando...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Agregar Fuente
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>



                {/* Tab Content: Radios */}
                <TabsContent value="radios" className="p-6">
                  <div className="space-y-6">
                    {/* Selector de Región para Radios */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Filtrar por Región
                      </Label>
                      <Select value={selectedRadioRegion} onValueChange={setSelectedRadioRegion}>
                        <SelectTrigger className="max-w-xs">
                          <SelectValue placeholder="Todas las regiones" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todas">Todas las regiones</SelectItem>
                          {availableRegions.map((region: string) => (
                            <SelectItem key={region} value={region}>
                              {region}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Lista de Radios */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Radios Registradas
                      </h3>

                      {loadingRadios ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-gray-500 mt-2">Cargando radios...</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {radios.length > 0 ? (
                            radios
                              .filter(radio => selectedRadioRegion === "todas" || !selectedRadioRegion || radio.region === selectedRadioRegion)
                              .map((radio) => (
                                <div key={radio.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                                  <div>
                                    <h4 className="font-medium text-gray-900">{radio.nombre}</h4>
                                    <div className="text-sm text-gray-500">
                                      <span className="font-medium">{radio.frecuencia}</span> - {radio.region}
                                    </div>
                                    {radio.url && (
                                      <a
                                        href={radio.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 text-sm hover:underline"
                                      >
                                        URL
                                      </a>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => eliminarRadio(radio.id)}
                                    className="h-8 w-8 p-0 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <Radio className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                              <p>No hay radios configuradas.</p>
                              <p className="text-sm">Agrega la primera radio usando el formulario de abajo.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Agregar Nueva Radio */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Agregar Nueva Radio
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">
                            Nombre de la Radio *
                          </Label>
                          <div className="relative">
                            <Radio className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Ej: Radio Biobío"
                              value={newRadioName}
                              onChange={(e) => setNewRadioName(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">
                            Frecuencia *
                          </Label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400">📻</div>
                            <Input
                              placeholder="Ej: 99.7 FM"
                              value={newRadioFrequency}
                              onChange={(e) => setNewRadioFrequency(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">
                            Región *
                          </Label>
                          <Select value={newRadioRegion} onValueChange={setNewRadioRegion}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una región" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRegions.map((region: string) => (
                                <SelectItem key={region} value={region}>
                                  {region}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">
                            URL (opcional)
                          </Label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400">🔗</div>
                            <Input
                              placeholder="https://..."
                              value={newRadioUrl}
                              onChange={(e) => setNewRadioUrl(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Button
                          onClick={handleAddRadio}
                          disabled={addingRadio}
                          className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                        >
                          {addingRadio ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Agregando...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Agregar Radio
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab Content: Clonación de Voz */}
                <TabsContent value="clonacion-voz" className="p-6">
                  <div className="space-y-6">
                    {/* Banner Informativo */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <UserCheck className="h-5 w-5 text-purple-600 mt-0.5" />
                        <div>
                          <h3 className="font-medium text-purple-800 mb-1">
                            Clonación de Voz
                          </h3>
                          <p className="text-sm text-purple-700">
                            Sube al menos 5 minutos de audio claro y sin música de fondo de la voz de tu locutor
                            para crear un clon de alta fidelidad. Este proceso puede tardar hasta 24 horas.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* 1. Nueva Voz */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          1. Nueva Voz
                        </h3>

                        <div className="space-y-4 mb-6">
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Nombre de la Voz
                            </Label>
                            <Input
                              placeholder="Ej: Juan Pérez - Locutor Principal"
                              value={voiceName}
                              onChange={(e) => setVoiceName(e.target.value)}
                            />
                          </div>

                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                            <div className="space-y-4">
                              <Upload className="mx-auto h-12 w-12 text-gray-400" />
                              <div>
                                <p className="text-gray-600 mb-2">
                                  Arrastra y suelta un archivo de audio aquí (.wav, .mp3)
                                </p>
                                <input
                                  type="file"
                                  accept="audio/*,.mp3,.wav"
                                  onChange={handleFileUpload}
                                  className="hidden"
                                  id="audio-upload"
                                />
                                <label htmlFor="audio-upload">
                                  <Button variant="outline" className="cursor-pointer" asChild>
                                    <span>O selecciona archivo</span>
                                  </Button>
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Lista de archivos subidos */}
                        {uploadedFiles.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium text-gray-700 mb-2">
                              Archivo seleccionado
                            </h4>
                            <div className="space-y-2">
                              {uploadedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-sm text-gray-700 truncate">{file.name}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Trash2 className="h-3 w-3 text-red-500" />
                                  </Button>
                                </div>
                              ))}
                            </div>

                            <div className="mt-6">
                              <Button
                                onClick={handleTrainVoiceClone}
                                disabled={isTrainingVoiceClone || !voiceName.trim()}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                              >
                                {isTrainingVoiceClone ? 'Procesando...' : 'Crear Voz Clonada'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 2. Mis Voces Clonadas */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          2. Mis Voces Clonadas
                        </h3>

                        {loadingVoices ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                            <p className="text-gray-500 mt-2">Cargando voces...</p>
                          </div>
                        ) : clonedVoices.length > 0 ? (
                          <div className="space-y-3">
                            {clonedVoices.map((voice) => (
                              <div key={voice.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                                <div className="flex items-center space-x-3">
                                  <div className="bg-purple-100 p-2 rounded-full">
                                    <UserCheck className="h-5 w-5 text-purple-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">{voice.name}</h4>
                                    <p className="text-xs text-gray-500">ID: {voice.id}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                    Activa
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                            <UserCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-gray-500">No tienes voces clonadas aún.</p>
                            <p className="text-sm text-gray-400">Sube un audio para comenzar.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  )
}
