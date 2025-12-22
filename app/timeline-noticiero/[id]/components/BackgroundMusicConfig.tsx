import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/lib/supabase'
import { Music, Volume2, Play, Pause, Loader2, X } from 'lucide-react'
interface MusicItem {
    id: string
    nombre: string
    audio: string
    duracion?: string
    duration_seconds?: number
}

interface BackgroundMusicConfigProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    currentMusicUrl: string | null
    currentVolume: number
    onSave: (musicUrl: string | null, volume: number) => void
}

export function BackgroundMusicConfig({
    open,
    onOpenChange,
    currentMusicUrl,
    currentVolume,
    onSave
}: BackgroundMusicConfigProps) {
    const [musicItems, setMusicItems] = useState<MusicItem[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedUrl, setSelectedUrl] = useState<string | null>(currentMusicUrl)
    const [volume, setVolume] = useState(currentVolume * 100)
    const [enabled, setEnabled] = useState(!!currentMusicUrl)
    const [playingId, setPlayingId] = useState<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        if (open) {
            loadMusicItems()
            setSelectedUrl(currentMusicUrl)
            setVolume(currentVolume * 100)
            setEnabled(!!currentMusicUrl)
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current = null
            }
        }
    }, [open, currentMusicUrl, currentVolume])

    const loadMusicItems = async () => {
        setLoading(true)
        try {
            let userEmail: string | null = null
            try {
                userEmail = localStorage.getItem('vira_user_email')
            } catch (e) {
                console.warn('No se pudo leer email')
            }

            let query = supabase
                .from('biblioteca_audio')
                .select('*')
                .eq('tipo', 'musica')
                .eq('is_active', true)
                .order('created_at', { ascending: false })

            if (userEmail) {
                query = query.or(`usuario.eq.${userEmail},usuario.eq.todos,usuario.is.null`)
            }

            const { data, error } = await query
            if (error) throw error
            setMusicItems(data || [])
        } catch (error) {
            console.error('Error loading music:', error)
            toast.error('Error al cargar música')
        } finally {
            setLoading(false)
        }
    }

    const handlePlayPause = (item: MusicItem) => {
        if (playingId === item.id) {
            audioRef.current?.pause()
            setPlayingId(null)
        } else {
            if (audioRef.current) {
                audioRef.current.pause()
            }
            audioRef.current = new Audio(item.audio)
            audioRef.current.volume = volume / 100
            audioRef.current.onended = () => setPlayingId(null)
            audioRef.current.play()
            setPlayingId(item.id)
        }
    }

    const handleVolumeChange = (value: number[]) => {
        setVolume(value[0])
        if (audioRef.current) {
            audioRef.current.volume = value[0] / 100
        }
    }

    const handleSave = () => {
        if (enabled && selectedUrl) {
            onSave(selectedUrl, volume / 100)
            toast.success('Música de fondo configurada')
        } else {
            onSave(null, 0.2)
            toast.success('Música de fondo desactivada')
        }
        onOpenChange(false)
    }

    const handleClear = () => {
        setSelectedUrl(null)
        setEnabled(false)
        if (audioRef.current) {
            audioRef.current.pause()
            setPlayingId(null)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            if (!isOpen && audioRef.current) {
                audioRef.current.pause()
                setPlayingId(null)
            }
            onOpenChange(isOpen)
        }}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Music className="h-5 w-5 text-blue-600" />
                        Música de Fondo
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Toggle de activación */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Music className="h-5 w-5 text-blue-600" />
                            <div>
                                <Label className="font-medium">Activar música de fondo</Label>
                                <p className="text-sm text-gray-500">
                                    La música se mezclará con el audio del noticiero
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={enabled}
                            onCheckedChange={setEnabled}
                        />
                    </div>

                    {enabled && (
                        <>
                            {/* Control de volumen */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2">
                                        <Volume2 className="h-4 w-4" />
                                        Volumen: {Math.round(volume)}%
                                    </Label>
                                </div>
                                <Slider
                                    value={[volume]}
                                    onValueChange={handleVolumeChange}
                                    max={100}
                                    min={5}
                                    step={5}
                                    className="w-full"
                                />
                                <p className="text-xs text-gray-500">
                                    Recomendado: 15-25% para no opacar las voces
                                </p>
                            </div>

                            {/* Selector de música */}
                            <div className="space-y-2">
                                <Label>Seleccionar música</Label>
                                {loading ? (
                                    <div className="flex justify-center p-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                    </div>
                                ) : musicItems.length === 0 ? (
                                    <div className="text-center p-6 text-gray-500 bg-gray-50 rounded-lg">
                                        <Music className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                                        <p>No tienes música disponible.</p>
                                        <p className="text-sm mt-1">Sube archivos en Bibliotecas.</p>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[200px] pr-4">
                                        <div className="space-y-2">
                                            {musicItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedUrl === item.audio
                                                        ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500'
                                                        : 'hover:bg-gray-50 border-gray-200'
                                                        }`}
                                                    onClick={() => setSelectedUrl(item.audio)}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                                <Music className="h-4 w-4 text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-medium text-sm">{item.nombre}</h4>
                                                                {item.duracion && (
                                                                    <span className="text-xs text-gray-500">{item.duracion}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handlePlayPause(item)
                                                            }}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            {playingId === item.id ? (
                                                                <Pause className="h-4 w-4" />
                                                            ) : (
                                                                <Play className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </div>

                            {/* Música seleccionada */}
                            {selectedUrl && (
                                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                                    <span className="text-sm text-blue-700">
                                        ✓ Música seleccionada
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleClear}
                                        className="h-6 text-blue-600 hover:text-blue-800"
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        Quitar
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <Music className="mr-2 h-4 w-4" />
                        Guardar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
