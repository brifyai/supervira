import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { Loader2, Music, Radio, Sparkles, Play, Pause, Volume2 } from 'lucide-react'
interface AudioItem {
    id: string
    nombre: string
    audio: string
    tipo: string
    duracion?: string
    duration_seconds?: number
    descripcion?: string
}

interface AddAudioModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onAddAudio: (audio: any) => void
}

const AUDIO_TYPES = [
    { value: 'cortina', label: 'Cortinas', icon: Radio, color: 'purple' },
    { value: 'musica', label: 'Música', icon: Music, color: 'blue' },
    { value: 'efecto', label: 'Efectos', icon: Sparkles, color: 'green' },
]

export function AddAudioModal({ open, onOpenChange, onAddAudio }: AddAudioModalProps) {
    const [audioItems, setAudioItems] = useState<AudioItem[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [selectedType, setSelectedType] = useState('cortina')
    const [playingId, setPlayingId] = useState<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        if (open) {
            loadAudioItems()
        }
        return () => {
            // Limpiar audio al cerrar
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current = null
            }
        }
    }, [open])

    useEffect(() => {
        // Recargar cuando cambia el tipo
        if (open) {
            loadAudioItems()
            setSelectedId(null)
        }
    }, [selectedType])

    const loadAudioItems = async () => {
        setLoading(true)
        try {
            // Obtener email del usuario
            let userEmail: string | null = null
            try {
                userEmail = localStorage.getItem('vira_user_email')
            } catch (e) {
                console.warn('No se pudo leer email de localStorage')
            }

            // Construir query
            let query = supabase
                .from('biblioteca_audio')
                .select('*')
                .eq('tipo', selectedType)
                .eq('is_active', true)
                .order('created_at', { ascending: false })

            // Filtrar por usuario o globales
            if (userEmail) {
                query = query.or(`usuario.eq.${userEmail},usuario.eq.todos,usuario.is.null`)
            }

            const { data, error } = await query

            if (error) throw error
            setAudioItems(data || [])
        } catch (error) {
            console.error('Error loading audio items:', error)
            toast.error('Error al cargar audios')
        } finally {
            setLoading(false)
        }
    }

    const handlePlayPause = (item: AudioItem) => {
        if (playingId === item.id) {
            // Pausar
            audioRef.current?.pause()
            setPlayingId(null)
        } else {
            // Reproducir nuevo
            if (audioRef.current) {
                audioRef.current.pause()
            }
            audioRef.current = new Audio(item.audio)
            audioRef.current.onended = () => setPlayingId(null)
            audioRef.current.play()
            setPlayingId(item.id)
        }
    }

    const handleConfirm = () => {
        if (!selectedId) return
        const item = audioItems.find(a => a.id === selectedId)
        if (item) {
            onAddAudio({
                id: `${selectedType}-${Date.now()}`,
                title: item.nombre,
                content: item.descripcion || `${selectedType} de audio`,
                type: selectedType,
                audioUrl: item.audio,
                duration: item.duration_seconds || 5,
                audioLibraryId: item.id,
                insertedBy: 'manual'
            })
            onOpenChange(false)
            setSelectedId(null)
            // Pausar audio si está sonando
            if (audioRef.current) {
                audioRef.current.pause()
                setPlayingId(null)
            }
            toast.success(`${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} agregada al timeline`)
        }
    }

    const getTypeConfig = (type: string) => {
        return AUDIO_TYPES.find(t => t.value === type) || AUDIO_TYPES[0]
    }

    const currentType = getTypeConfig(selectedType)

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            if (!isOpen && audioRef.current) {
                audioRef.current.pause()
                setPlayingId(null)
            }
            onOpenChange(isOpen)
        }}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Music className="h-5 w-5 text-purple-600" />
                        Insertar Audio
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        {AUDIO_TYPES.map((type) => (
                            <TabsTrigger key={type.value} value={type.value} className="flex items-center gap-1">
                                <type.icon className="h-4 w-4" />
                                {type.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {AUDIO_TYPES.map((type) => (
                        <TabsContent key={type.value} value={type.value} className="mt-4">
                            {loading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                                </div>
                            ) : audioItems.length === 0 ? (
                                <div className="text-center p-8 text-gray-500">
                                    <type.icon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                    <p>No tienes {type.label.toLowerCase()} disponibles.</p>
                                    <p className="text-sm mt-1">Sube archivos en la sección Bibliotecas.</p>
                                </div>
                            ) : (
                                <ScrollArea className="h-[280px] pr-4">
                                    <div className="space-y-2">
                                        {audioItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedId === item.id
                                                    ? `bg-${type.color}-50 border-${type.color}-500 ring-1 ring-${type.color}-500`
                                                    : 'hover:bg-gray-50 border-gray-200'
                                                    }`}
                                                onClick={() => setSelectedId(item.id)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-10 w-10 rounded-full bg-${type.color}-100 flex items-center justify-center text-${type.color}-600`}>
                                                            <type.icon className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-medium text-gray-900">{item.nombre}</h4>
                                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                {item.duracion && (
                                                                    <span>{item.duracion}</span>
                                                                )}
                                                                {item.descripcion && (
                                                                    <span className="line-clamp-1">• {item.descripcion}</span>
                                                                )}
                                                            </div>
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
                        </TabsContent>
                    ))}
                </Tabs>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedId}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        <Music className="mr-2 h-4 w-4" />
                        Insertar {currentType.label.slice(0, -1)}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
