
'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Plus, Edit, Trash2, Star, X, Eye, Play } from 'lucide-react'
import Swal from 'sweetalert2'
import { supabase } from '@/lib/supabase'
import { VoiceSelector } from '@/components/newscast/VoiceSelector'

// Interfaz para las fuentes seleccionadas
interface FuenteSeleccionada {
  nombre_fuente: string
  cantidad: number
}

// Interfaz para radios
interface RadioStation {
  id: string
  nombre: string
  region: string
}

// Interfaz para las plantillas alineada con la API
interface Plantilla {
  id: string
  name: string
  description?: string
  region: string
  radio_station: string
  duration_minutes: number
  voice_provider: string
  voice_id: string
  include_weather: boolean
  include_time: boolean
  ad_frequency: number
  categories: string[]
  configuration: {
    cantidad_fuentes?: FuenteSeleccionada[]
    [key: string]: any
  }
  user_id?: string
  created_at?: string
  updated_at?: string
}

const categoriesList = [
  { id: 'regionales', label: 'Regionales', checked: true },
  { id: 'nacionales', label: 'Nacionales', checked: true },
  { id: 'deportes', label: 'Deportes', checked: false },
  { id: 'economia', label: 'Economía', checked: false },
  { id: 'mundo', label: 'Mundo', checked: false },
  { id: 'tendencias', label: 'Tendencias', checked: false },
  { id: 'farandula', label: 'Farandula', checked: false }
]



export default function PlantillasPage() {
  const router = useRouter()
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingPlantilla, setEditingPlantilla] = useState<Plantilla | null>(null)

  // Estado del formulario
  const [templateName, setTemplateName] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedRadio, setSelectedRadio] = useState('')
  const [duration, setDuration] = useState([15])
  const [adFrequency, setAdFrequency] = useState(3)
  const [selectedCategories, setSelectedCategories] = useState(categoriesList)
  const [selectedVoice, setSelectedVoice] = useState('alloy')
  const [voiceWPM, setVoiceWPM] = useState(150)
  const [adCount, setAdCount] = useState(3)
  const [timeStrategy, setTimeStrategy] = useState('auto')
  const [includeWeather, setIncludeWeather] = useState(true)

  // Regiones y Radios dinámicas (multi-tenant)
  const [regions, setRegions] = useState<string[]>([])
  const [radioStations, setRadioStations] = useState<RadioStation[]>([])
  const [loadingRadios, setLoadingRadios] = useState(false)

  // Estados para fuentes sugeridas
  const [fuentes, setFuentes] = useState<Array<{ id: string, nombre: string, nombre_fuente: string, url: string }>>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [sourceNewsCount, setSourceNewsCount] = useState<{ [key: string]: number }>({})
  const [loadingFuentes, setLoadingFuentes] = useState(false)

  // Cargar regiones desde BD
  const cargarRegiones = async () => {
    try {
      const { data, error } = await supabase
        .from('configuraciones_regiones')
        .select('region')
        .eq('esta_activo', true)
        .order('region', { ascending: true })

      if (error) throw error
      if (data) {
        setRegions(data.map(r => r.region))
      }
    } catch (error) {
      console.error('Error al cargar regiones:', error)
      setRegions(['Nacional', 'Metropolitana de Santiago', 'Valparaíso', 'Biobío'])
    }
  }

  // Cargar radios desde API (multi-tenant)
  const cargarRadios = async () => {
    try {
      setLoadingRadios(true)
      const response = await fetch('/api/radios')
      const data = await response.json()

      if (data.radios && data.radios.length > 0) {
        setRadioStations(data.radios)
        // Extraer regiones únicas de las radios
        const uniqueRegions = [...new Set(data.radios.map((r: RadioStation) => r.region))].sort()
        setRegions(uniqueRegions as string[])
      }
    } catch (error) {
      console.error('Error al cargar radios:', error)
      setRadioStations([])
    } finally {
      setLoadingRadios(false)
    }
  }

  // Obtener radios filtradas por región
  const getRadiosForRegion = (region: string): RadioStation[] => {
    if (!region) return radioStations
    return radioStations.filter(r => r.region === region)
  }

  // Función para limpiar el formulario
  const limpiarFormulario = () => {
    setTemplateName('')
    if (regions.length > 0) {
      setSelectedRegion(regions[0])
    } else {
      setSelectedRegion('')
    }
    setSelectedRadio('')
    setDuration([15])
    setAdFrequency(3)
    setSelectedCategories(categoriesList.map(cat => ({
      ...cat,
      checked: cat.id === 'regionales' || cat.id === 'nacionales'
    })))
    setSelectedVoice('alloy')
    setAdCount(3)
    setTimeStrategy('auto')
    setIncludeWeather(true)
    setSelectedSources([])
    setSourceNewsCount({})
    setEditingPlantilla(null)
  }

  // Cargar plantillas desde API
  const cargarPlantillas = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/templates')
      const data = await response.json()

      if (data.success) {
        setPlantillas(data.templates || [])
      } else {
        console.error('Error al cargar plantillas:', data.error)
        setPlantillas([])
      }
    } catch (error) {
      console.error('Error de red al cargar plantillas:', error)
      setPlantillas([])
    } finally {
      setLoading(false)
    }
  }

  // Cargar fuentes suscritas del usuario (multi-tenant)
  const cargarFuentes = async () => {
    setLoadingFuentes(true)
    try {
      const response = await fetch('/api/fuentes?subscribed=true')
      const data = await response.json()

      if (data.fuentes && data.fuentes.length > 0) {
        setFuentes(data.fuentes)
      } else {
        // Fallback: cargar todas las fuentes si no hay API
        const { data: fuentesData, error } = await supabase
          .from('fuentes_final')
          .select('*')
          .order('nombre_fuente', { ascending: true })

        if (!error && fuentesData) {
          setFuentes(fuentesData)
        } else {
          setFuentes([])
        }
      }
    } catch (error) {
      console.error('Error al cargar fuentes:', error)
      setFuentes([])
    } finally {
      setLoadingFuentes(false)
    }
  }

  useEffect(() => {
    cargarPlantillas()
    cargarFuentes()
    cargarRadios() // Cargar radios multi-tenant
  }, [])

  // Cargar datos para editar
  const cargarDatosParaEditar = (plantilla: Plantilla) => {
    setTemplateName(plantilla.name)
    setSelectedRegion(plantilla.region)
    setSelectedRadio(plantilla.radio_station)
    setDuration([plantilla.duration_minutes])
    setDuration([plantilla.duration_minutes])
    setSelectedVoice(plantilla.voice_id || 'alloy')
    setAdFrequency(plantilla.ad_frequency)
    setAdCount(plantilla.configuration?.adCount || 3)
    setTimeStrategy(plantilla.configuration?.timeStrategy || (plantilla.include_time ? 'auto' : 'none'))
    setIncludeWeather(plantilla.include_weather !== undefined ? plantilla.include_weather : true)

    // Categorías
    const categoriasActualizadas = categoriesList.map(cat => ({
      ...cat,
      checked: plantilla.categories.includes(cat.label)
    }))
    setSelectedCategories(categoriasActualizadas)

    // Fuentes
    const fuentesConfig = plantilla.configuration?.cantidad_fuentes || []
    if (Array.isArray(fuentesConfig) && fuentesConfig.length > 0) {
      const fuentesSeleccionadas = fuentesConfig.map(f => f.nombre_fuente)
      setSelectedSources(fuentesSeleccionadas)

      const cantidadesObj = fuentesConfig.reduce((acc, item) => {
        acc[item.nombre_fuente] = item.cantidad
        return acc
      }, {} as { [key: string]: number })
      setSourceNewsCount(cantidadesObj)
    } else {
      setSelectedSources([])
      setSourceNewsCount({})
    }

    setEditingPlantilla(plantilla)
  }

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    setSelectedCategories(categories =>
      categories.map(cat =>
        cat.id === categoryId ? { ...cat, checked } : cat
      )
    )
  }

  // Manejo de fuentes
  const handleSourceSelect = (sourceName: string) => {
    setSelectedSources(prev => {
      const isCurrentlySelected = prev.includes(sourceName)
      if (isCurrentlySelected) {
        const newSourceNewsCount = { ...sourceNewsCount }
        delete newSourceNewsCount[sourceName]
        setSourceNewsCount(newSourceNewsCount)
        return prev.filter(source => source !== sourceName)
      } else {
        setSourceNewsCount(prev => ({ ...prev, [sourceName]: 3 }))
        return [...prev, sourceName]
      }
    })
  }

  const handleNewsCountChange = (sourceName: string, count: number) => {
    const newCount = Math.max(1, Math.min(10, count))
    setSourceNewsCount(prev => ({ ...prev, [sourceName]: newCount }))
  }

  // Guardar nueva plantilla
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      await Swal.fire({ icon: 'warning', title: 'Nombre requerido', text: 'Por favor ingrese un nombre para la plantilla' })
      return
    }

    const categoriasSeleccionadas = selectedCategories
      .filter(cat => cat.checked)
      .map(cat => cat.label)

    const fuentesConCantidades: FuenteSeleccionada[] = selectedSources
      .filter(fuente => sourceNewsCount[fuente] && sourceNewsCount[fuente] > 0)
      .map(fuente => ({
        nombre_fuente: fuente,
        cantidad: Number(sourceNewsCount[fuente])
      }))

    const payload = {
      name: templateName,
      region: selectedRegion,
      radio_station: selectedRadio,
      duration_minutes: duration[0],
      voice_provider: 'openai',
      voice_id: selectedVoice,
      include_weather: includeWeather,
      include_time: timeStrategy !== 'none',
      ad_frequency: adFrequency,
      categories: categoriasSeleccionadas,
      configuration: {
        cantidad_fuentes: fuentesConCantidades,
        adCount: adCount,
        timeStrategy: timeStrategy
      }
    }

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        await Swal.fire({ icon: 'success', title: 'Plantilla guardada', text: 'Plantilla guardada exitosamente!' })
        setIsModalOpen(false)
        limpiarFormulario()
        cargarPlantillas()
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (error) {
      console.error('Error al guardar:', error)
      await Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar la plantilla.' })
    }
  }

  // Actualizar plantilla existente (Usando Supabase directo por ahora)
  const handleUpdateTemplate = async () => {
    if (!templateName.trim() || !editingPlantilla) return

    const categoriasSeleccionadas = selectedCategories
      .filter(cat => cat.checked)
      .map(cat => cat.label)

    const fuentesConCantidades = selectedSources
      .map(fuente => ({
        nombre_fuente: fuente,
        cantidad: Number(sourceNewsCount[fuente] || 3)
      }))

    const updatePayload = {
      nombre: templateName,
      region: selectedRegion,
      radio_station: selectedRadio,
      duracion_minutos: duration[0],
      voz_id: selectedVoice,
      incluir_clima: includeWeather,
      incluir_hora: timeStrategy !== 'none',
      frecuencia_anuncios: adFrequency,
      categorias: categoriasSeleccionadas,
      configuracion: {
        cantidad_fuentes: fuentesConCantidades,
        adCount: adCount,
        timeStrategy: timeStrategy
      }
    }

    try {
      const { error } = await supabase
        .from('plantillas')
        .update(updatePayload)
        .eq('id', editingPlantilla.id)

      if (error) throw error

      await Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Plantilla actualizada correctamente' })
      setIsEditModalOpen(false)
      limpiarFormulario()
      cargarPlantillas()
    } catch (error) {
      console.error('Error update:', error)
      await Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar.' })
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar plantilla?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('plantillas').delete().eq('id', id)
        if (error) throw error

        await Swal.fire('Eliminado', 'La plantilla ha sido eliminada.', 'success')
        cargarPlantillas()
      } catch (error) {
        console.error('Error delete:', error)
        await Swal.fire('Error', 'No se pudo eliminar.', 'error')
      }
    }
  }

  const handleEditTemplate = (plantilla: Plantilla) => {
    cargarDatosParaEditar(plantilla)
    setIsEditModalOpen(true)
  }

  const handleGenerateNewscast = async (plantilla: Plantilla) => {
    console.log('Generando desde plantilla:', plantilla)

    // Llamar directamente al API de generación
    try {
      Swal.fire({
        title: 'Generando noticiero...',
        text: 'Esto puede tomar unos momentos',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading()
        }
      })

      const response = await fetch('/api/generate-newscast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region: plantilla.region,
          categories: plantilla.categories,
          targetDuration: plantilla.duration_minutes * 60, // convertir a segundos
          generateAudioNow: false,
          adCount: plantilla.configuration?.adCount || 3,
          includeTimeWeather: plantilla.include_weather,
          voiceModel: plantilla.voice_id,
          voiceWPM: 150, // Default WPM
          templateId: plantilla.id
        })
      })

      const data = await response.json()
      Swal.close()

      if (data.success && data.newscastId) {
        await Swal.fire({ icon: 'success', title: 'Noticiero generado', timer: 1500, showConfirmButton: false })
        router.push(`/timeline-noticiero/${data.newscastId}`)
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (error) {
      Swal.close()
      console.error('Error generando noticiero:', error)
      await Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar el noticiero' })
    }
  }



  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Perfiles y Plantillas</h1>

          <Dialog open={isModalOpen} onOpenChange={(open) => {
            if (open) limpiarFormulario()
            setIsModalOpen(open)
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Crear Nuevo
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nueva Plantilla</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label>Nombre de la Plantilla</Label>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Ej: Resumen Matutino"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Región</Label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar región" /></SelectTrigger>
                      <SelectContent>
                        {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Radio</Label>
                    <Select value={selectedRadio} onValueChange={setSelectedRadio}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar radio" /></SelectTrigger>
                      <SelectContent>
                        {getRadiosForRegion(selectedRegion).map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.nombre} ({r.region})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Duración: {duration[0]} minutos</Label>
                  <Slider
                    value={duration}
                    onValueChange={setDuration}
                    min={5}
                    max={60}
                    step={5}
                  />
                </div>

                <div className="space-y-2">
                  <VoiceSelector
                    value={selectedVoice}
                    onChange={(voiceId, wpm) => {
                      setSelectedVoice(voiceId)
                      if (wpm) setVoiceWPM(wpm)
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4 mt-4">
                  <div className="space-y-2">
                    <Label>Estrategia de Hora</Label>
                    <Select value={timeStrategy} onValueChange={setTimeStrategy}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Automática (Al generar)</SelectItem>
                        <SelectItem value="scheduled">Hora Programada</SelectItem>
                        <SelectItem value="none">No incluir hora</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 mt-8">
                    <Checkbox
                      id="weather"
                      checked={includeWeather}
                      onCheckedChange={(c) => setIncludeWeather(c as boolean)}
                    />
                    <Label htmlFor="weather">Incluir reporte del clima</Label>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium text-gray-900">Configuración de Publicidad</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Cantidad de Anuncios</Label>
                      <span className="text-sm font-medium text-blue-600">{adCount} anuncios</span>
                    </div>
                    <Slider
                      value={[adCount]}
                      onValueChange={(vals) => setAdCount(vals[0])}
                      min={0}
                      max={10}
                      step={1}
                    />
                    <p className="text-xs text-gray-500">
                      Se distribuirán equitativamente durante el noticiero.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Categorías</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {selectedCategories.map(cat => (
                      <div key={cat.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cat-${cat.id}`}
                          checked={cat.checked}
                          onCheckedChange={(checked) => handleCategoryChange(cat.id, checked as boolean)}
                        />
                        <label htmlFor={`cat-${cat.id}`} className="text-sm">{cat.label}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fuentes de Noticias</Label>
                  <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                    {loadingFuentes ? (
                      <p className="text-sm text-gray-500">Cargando fuentes...</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {fuentes.filter(f => f.nombre_fuente).map(fuente => (
                          <div key={fuente.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={selectedSources.includes(fuente.nombre_fuente)}
                                onCheckedChange={() => handleSourceSelect(fuente.nombre_fuente)}
                              />
                              <span className="text-sm font-medium">{fuente.nombre_fuente}</span>
                            </div>
                            {selectedSources.includes(fuente.nombre_fuente) && (
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">Noticias:</span>
                                <Input
                                  type="number"
                                  className="w-16 h-8"
                                  min={1}
                                  max={10}
                                  value={sourceNewsCount[fuente.nombre_fuente] || 3}
                                  onChange={(e) => handleNewsCountChange(fuente.nombre_fuente, parseInt(e.target.value))}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Button onClick={handleSaveTemplate} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Guardar Plantilla
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Plantillas */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Cargando plantillas...</p>
          </div>
        ) : plantillas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No hay plantillas creadas aún.</p>
            <Button variant="link" onClick={() => setIsModalOpen(true)}>Crear la primera</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plantillas.map(plantilla => (
              <Card key={plantilla.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-bold text-gray-900">{plantilla.name}</CardTitle>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditTemplate(plantilla)}>
                        <Edit className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(plantilla.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">{plantilla.region} • {plantilla.radio_station}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Duración:</span>
                      <span className="font-medium">{plantilla.duration_minutes} min</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Fuentes:</span>
                      <span className="font-medium">
                        {plantilla.configuration?.cantidad_fuentes?.length || 0} seleccionadas
                      </span>
                    </div>
                    <div className="pt-4">
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleGenerateNewscast(plantilla)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Generar Noticiero
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal de Edición */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Plantilla</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Región</Label>
                  <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar región" /></SelectTrigger>
                    <SelectContent>
                      {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Radio</Label>
                  <Select value={selectedRadio} onValueChange={setSelectedRadio}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar radio" /></SelectTrigger>
                    <SelectContent>
                      {getRadiosForRegion(selectedRegion).map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.nombre} ({r.region})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Duración: {duration[0]} minutos</Label>
                <Slider value={duration} onValueChange={setDuration} min={5} max={60} step={5} />
              </div>

              <div className="space-y-2">
                <VoiceSelector
                  value={selectedVoice}
                  onChange={(voiceId, wpm) => {
                    setSelectedVoice(voiceId)
                    if (wpm) setVoiceWPM(wpm)
                  }}
                />
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium text-gray-900">Configuración de Publicidad</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Cantidad de Anuncios</Label>
                    <span className="text-sm font-medium text-blue-600">{adCount} anuncios</span>
                  </div>
                  <Slider
                    value={[adCount]}
                    onValueChange={(vals) => setAdCount(vals[0])}
                    min={0}
                    max={10}
                    step={1}
                  />
                  <p className="text-xs text-gray-500">
                    Se distribuirán equitativamente durante el noticiero.
                  </p>
                </div>
              </div>

              {/* Categorías */}
              <div className="space-y-2 border-t pt-4">
                <Label>Categorías</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {selectedCategories.map(cat => (
                    <div key={cat.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-cat-${cat.id}`}
                        checked={cat.checked}
                        onCheckedChange={(checked) => handleCategoryChange(cat.id, checked as boolean)}
                      />
                      <label htmlFor={`edit-cat-${cat.id}`} className="text-sm">{cat.label}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fuentes</Label>
                <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-2">
                    {fuentes.filter(f => f.nombre_fuente).map(fuente => (
                      <div key={fuente.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedSources.includes(fuente.nombre_fuente)}
                            onCheckedChange={() => handleSourceSelect(fuente.nombre_fuente)}
                          />
                          <span className="text-sm font-medium">{fuente.nombre_fuente}</span>
                        </div>
                        {selectedSources.includes(fuente.nombre_fuente) && (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Noticias:</span>
                            <Input
                              type="number"
                              className="w-16 h-8"
                              min={1}
                              max={10}
                              value={sourceNewsCount[fuente.nombre_fuente] || 3}
                              onChange={(e) => handleNewsCountChange(fuente.nombre_fuente, parseInt(e.target.value))}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Button onClick={handleUpdateTemplate} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Actualizar Plantilla
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  )
}
