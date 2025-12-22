'use client'

import { toast } from 'react-toastify'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { supabase } from '@/lib/supabase'
import { Music, Volume2, Play, Pause, ChevronDown, ChevronUp, X, Check, Loader2 } from 'lucide-react'
interface MusicItem {
    id: string
    nombre: string
    audio: string
    duracion?: string
}

interface BackgroundMusicConfig {
    mode: 'global' | 'range'
    fromNews?: number
    toNews?: number
}

interface BackgroundMusicBarProps {
    newsCount: number
    currentMusicUrl: string | null
    currentVolume: number
    currentConfig: BackgroundMusicConfig | null
    onSave: (musicUrl: string | null, volume: number, config: BackgroundMusicConfig | null) => void
    disabled?: boolean
}

export function BackgroundMusicBar({
    newsCount,
    currentMusicUrl,
    currentVolume,
    currentConfig,
    onSave,
    disabled = false
}: BackgroundMusicBarProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [musicItems, setMusicItems] = useState<MusicItem[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedUrl, setSelectedUrl] = useState<string | null>(currentMusicUrl)
    const [selectedName, setSelectedName] = useState<string>('')
    const [volume, setVolume] = useState(currentVolume * 100)
    const [mode, setMode] = useState<'global' | 'range'>(currentConfig?.mode || 'global')
    const [fromNews, setFromNews] = useState(currentConfig?.fromNews || 1)
    const [toNews, setToNews] = useState(currentConfig?.toNews || newsCount)
    const [isPlaying, setIsPlaying] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const hasMusic = !!currentMusicUrl

    // Cargar música disponible
    useEffect(() => {
        if (isExpanded && musicItems.length === 0) {
            loadMusicItems()
        }
    }, [isExpanded])

    // Actualizar nombre cuando cambia la selección
    useEffect(() => {
        if (selectedUrl) {
            const item = musicItems.find(m => m.audio === selectedUrl)
            if (item) setSelectedName(item.nombre)
        }
    }, [selectedUrl, musicItems])

    const loadMusicItems = async () => {
        setLoading(true)
        try {
            let userEmail: string | null = null
            try {
                userEmail = localStorage.getItem('vira_user_email')
            } catch (e) {
                console.warn('No se pudo leer email')
            }

            const { data, error } = await supabase
                .from('biblioteca_audio')
                .select('id, nombre, audio, duracion')
                .eq('tipo', 'musica')
                .eq('is_active', true)
                .order('created_at', { ascending: false })

            if (error) throw error
            setMusicItems(data || [])
        } catch (error) {
            console.error('Error loading music:', error)
            toast.error('Error al cargar música')
        } finally {
            setLoading(false)
        }
    }

    const handlePlayPause = () => {
        if (!selectedUrl) return

        if (isPlaying) {
            audioRef.current?.pause()
            setIsPlaying(false)
        } else {
            if (audioRef.current) {
                audioRef.current.pause()
            }
            audioRef.current = new Audio(selectedUrl)
            audioRef.current.volume = volume / 100
            audioRef.current.onended = () => setIsPlaying(false)
            audioRef.current.play()
            setIsPlaying(true)
        }
    }

    const handleSave = () => {
        if (audioRef.current) {
            audioRef.current.pause()
            setIsPlaying(false)
        }

        const config: BackgroundMusicConfig = {
            mode,
            ...(mode === 'range' && { fromNews, toNews })
        }

        onSave(selectedUrl, volume / 100, selectedUrl ? config : null)
        setIsExpanded(false)
        toast.success(selectedUrl ? 'Música de fondo configurada' : 'Música de fondo desactivada')
    }

    const handleClear = () => {
        setSelectedUrl(null)
        setSelectedName('')
        setMode('global')
        setFromNews(1)
        setToNews(newsCount)
        if (audioRef.current) {
            audioRef.current.pause()
            setIsPlaying(false)
        }
    }

    const handleCancel = () => {
        // Restaurar valores originales
        setSelectedUrl(currentMusicUrl)
        setVolume(currentVolume * 100)
        setMode(currentConfig?.mode || 'global')
        setFromNews(currentConfig?.fromNews || 1)
        setToNews(currentConfig?.toNews || newsCount)
        if (audioRef.current) {
            audioRef.current.pause()
            setIsPlaying(false)
        }
        setIsExpanded(false)
    }

    // Generar opciones de noticias
    const newsOptions = Array.from({ length: newsCount }, (_, i) => i + 1)

    // Vista colapsada
    if (!isExpanded) {
        return (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg px-4 py-3 mb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Music className="h-5 w-5 text-purple-600" />
                        {hasMusic ? (
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-800">Música:</span>
                                <span className="text-purple-700">"{selectedName || 'Seleccionada'}"</span>
                                <span className="text-gray-500">|</span>
                                <span className="text-gray-600">
                                    {currentConfig?.mode === 'range'
                                        ? `Noticias ${currentConfig.fromNews}-${currentConfig.toNews}`
                                        : 'Todo el noticiero'}
                                </span>
                                <span className="text-gray-500">|</span>
                                <span className="text-gray-600">{Math.round(currentVolume * 100)}%</span>
                            </div>
                        ) : (
                            <span className="text-gray-600">Música de Fondo (opcional)</span>
                        )}
                    </div>
                    {!disabled && (
                        <Button
                            variant={hasMusic ? "outline" : "default"}
                            size="sm"
                            onClick={() => setIsExpanded(true)}
                            className={hasMusic ? "border-purple-300 text-purple-700 hover:bg-purple-50" : "bg-purple-600 hover:bg-purple-700"}
                        >
                            {hasMusic ? (
                                <>✏️ Editar</>
                            ) : (
                                <>+ Agregar</>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        )
    }

    // Vista expandida
    return (
        <div className="bg-white border-2 border-purple-300 rounded-lg p-4 mb-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Music className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-800">Configurar Música de Fondo</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-4">
                {/* Selector de pista */}
                <div className="flex items-center gap-3">
                    <Label className="w-16 text-sm font-medium">Pista:</Label>
                    <Select
                        value={selectedUrl || ''}
                        onValueChange={(value) => setSelectedUrl(value || null)}
                    >
                        <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Seleccionar música..." />
                        </SelectTrigger>
                        <SelectContent>
                            {loading ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Cargando...
                                </div>
                            ) : musicItems.length === 0 ? (
                                <div className="py-4 text-center text-gray-500">
                                    No hay música. Sube archivos en Bibliotecas.
                                </div>
                            ) : (
                                musicItems.map((item) => (
                                    <SelectItem key={item.id} value={item.audio}>
                                        <div className="flex items-center gap-2">
                                            <span>♪ {item.nombre}</span>
                                            {item.duracion && (
                                                <span className="text-xs text-gray-400">({item.duracion})</span>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                    {selectedUrl && (
                        <Button variant="outline" size="icon" onClick={handlePlayPause}>
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                    )}
                </div>

                {/* Selector de modo */}
                {selectedUrl && (
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Modo:</Label>
                        <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'global' | 'range')}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="global" id="global" />
                                <Label htmlFor="global" className="cursor-pointer">
                                    Todo el noticiero (loop automático)
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="range" id="range" />
                                <Label htmlFor="range" className="cursor-pointer">
                                    Solo en algunas noticias
                                </Label>
                            </div>
                        </RadioGroup>

                        {/* Selector de rango */}
                        {mode === 'range' && (
                            <div className="flex items-center gap-3 pl-6 py-2 bg-gray-50 rounded-lg">
                                <span className="text-sm">Desde noticia</span>
                                <Select value={String(fromNews)} onValueChange={(v) => setFromNews(Number(v))}>
                                    <SelectTrigger className="w-20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {newsOptions.map(n => (
                                            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-sm">hasta noticia</span>
                                <Select value={String(toNews)} onValueChange={(v) => setToNews(Number(v))}>
                                    <SelectTrigger className="w-20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {newsOptions.filter(n => n >= fromNews).map(n => (
                                            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Volumen */}
                        <div className="flex items-center gap-3">
                            <Label className="w-16 text-sm font-medium">Volumen:</Label>
                            <Volume2 className="h-4 w-4 text-gray-500" />
                            <Slider
                                value={[volume]}
                                onValueChange={([v]) => setVolume(v)}
                                max={100}
                                step={5}
                                className="flex-1"
                            />
                            <span className="w-12 text-sm text-right">{volume}%</span>
                        </div>
                    </div>
                )}

                {/* Botones de acción */}
                <div className="flex items-center justify-between pt-2 border-t">
                    {selectedUrl && (
                        <Button variant="ghost" size="sm" onClick={handleClear} className="text-red-600 hover:text-red-700">
                            <X className="h-4 w-4 mr-1" />
                            Quitar música
                        </Button>
                    )}
                    <div className="flex gap-2 ml-auto">
                        <Button variant="outline" size="sm" onClick={handleCancel}>
                            Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
                            <Check className="h-4 w-4 mr-1" />
                            Aplicar
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
