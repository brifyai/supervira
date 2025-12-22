'use client'

import { useState, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Music, Play, Pause, X, Loader2, FileAudio } from 'lucide-react'

interface UploadAudioModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onUploadSuccess: (data: any) => void
    userEmail?: string
}

const AUDIO_TYPES = [
    { value: 'cortina', label: '🎵 Cortina', description: 'Separador entre noticias', placeholder: 'Ej: Usar para separar noticias deportivas de otras secciones' },
    { value: 'musica', label: '🎶 Música de fondo', description: 'Para reproducir de fondo', placeholder: 'Ej: Música suave para noticias de economía o clima' },
    { value: 'efecto', label: '🔊 Efecto de sonido', description: 'Sonidos cortos', placeholder: 'Ej: Usar antes de noticias urgentes o de última hora' },
    { value: 'jingle', label: '📻 Jingle', description: 'Identificador de radio', placeholder: 'Ej: Identificador de la radio, insertar cada 4-5 noticias' },
    { value: 'intro', label: '🎬 Intro', description: 'Apertura del noticiero', placeholder: 'Ej: Usar siempre al inicio del noticiero, antes de cualquier noticia' },
    { value: 'outro', label: '🔚 Outro', description: 'Cierre del noticiero', placeholder: 'Ej: Usar al final del noticiero como despedida' },
]

// Obtener placeholder según tipo seleccionado
const getPlaceholderForType = (tipo: string) => {
    const audioType = AUDIO_TYPES.find(t => t.value === tipo)
    return audioType?.placeholder || 'Describe cuándo y cómo debe usarse este audio'
}

export function UploadAudioModal({
    open,
    onOpenChange,
    onUploadSuccess,
    userEmail
}: UploadAudioModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [nombre, setNombre] = useState('')
    const [tipo, setTipo] = useState('cortina')
    const [descripcion, setDescripcion] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)

    // Limpiar estado al cerrar
    const handleClose = () => {
        if (audioRef.current) {
            audioRef.current.pause()
        }
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl)
        }
        setFile(null)
        setNombre('')
        setTipo('cortina')
        setDescripcion('')
        setError(null)
        setIsPlaying(false)
        setAudioUrl(null)
        onOpenChange(false)
    }

    // Manejar selección de archivo
    const handleFileSelect = (selectedFile: File) => {
        if (!selectedFile.type.startsWith('audio/')) {
            setError('El archivo debe ser de audio (MP3, WAV, etc.)')
            return
        }

        // Limpiar audio anterior
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl)
        }
        if (audioRef.current) {
            audioRef.current.pause()
        }

        setFile(selectedFile)
        setError(null)

        // Usar nombre del archivo como default
        if (!nombre) {
            setNombre(selectedFile.name.replace(/\.[^/.]+$/, ''))
        }

        // Crear URL para preview
        const url = URL.createObjectURL(selectedFile)
        setAudioUrl(url)
        setIsPlaying(false)
    }

    // Drag & Drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile) {
            handleFileSelect(droppedFile)
        }
    }, [])

    // Play/Pause preview
    const togglePlay = () => {
        if (!audioUrl) return

        if (!audioRef.current) {
            audioRef.current = new Audio(audioUrl)
            audioRef.current.onended = () => setIsPlaying(false)
        }

        if (isPlaying) {
            audioRef.current.pause()
            setIsPlaying(false)
        } else {
            audioRef.current.play()
            setIsPlaying(true)
        }
    }

    // Subir archivo
    const handleUpload = async () => {
        if (!file) {
            setError('Selecciona un archivo de audio')
            return
        }

        if (!nombre.trim()) {
            setError('Ingresa un nombre para el audio')
            return
        }

        setIsUploading(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('nombre', nombre.trim())
            formData.append('tipo', tipo)
            formData.append('descripcion', descripcion.trim())
            formData.append('global', 'false')

            const response = await fetch('/api/upload-audio', {
                method: 'POST',
                headers: {
                    'x-user-email': userEmail || 'anonymous'
                },
                body: formData
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Error al subir archivo')
            }

            const result = await response.json()

            if (!result.success) {
                throw new Error(result.error || 'Error al subir archivo')
            }

            // Éxito
            onUploadSuccess(result.data)
            handleClose()

        } catch (err) {
            console.error('Error uploading:', err)
            setError(err instanceof Error ? err.message : 'Error desconocido')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Music className="h-5 w-5 text-blue-600" />
                        Subir Audio
                    </DialogTitle>
                    <DialogDescription>
                        Añade cortinas, efectos o música a tu biblioteca
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Zona de Drag & Drop */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                            transition-all duration-200
                            ${isDragging
                                ? 'border-blue-500 bg-blue-50'
                                : file
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                            }
                        `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) handleFileSelect(f)
                            }}
                        />

                        {file ? (
                            <div className="flex items-center justify-center gap-3">
                                <FileAudio className="h-10 w-10 text-green-600" />
                                <div className="text-left">
                                    <p className="font-medium text-green-700">{file.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                {audioUrl && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            togglePlay()
                                        }}
                                        className="ml-2"
                                    >
                                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setFile(null)
                                        setAudioUrl(null)
                                        setNombre('')
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                <p className="mt-2 text-sm font-medium text-gray-700">
                                    Arrastra un archivo de audio aquí
                                </p>
                                <p className="text-xs text-gray-500">
                                    o haz clic para seleccionar (MP3, WAV, OGG)
                                </p>
                            </>
                        )}
                    </div>

                    {/* Nombre */}
                    <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre *</Label>
                        <Input
                            id="nombre"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej: Cortina deportes, Efecto breaking news..."
                        />
                    </div>

                    {/* Tipo de audio */}
                    <div className="space-y-2">
                        <Label>Tipo de audio *</Label>
                        <Select value={tipo} onValueChange={setTipo}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {AUDIO_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                        <div className="flex items-center gap-2">
                                            <span>{t.label}</span>
                                            <span className="text-xs text-gray-400">- {t.description}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Descripción para IA */}
                    <div className="space-y-2">
                        <Label htmlFor="descripcion">
                            Descripción / Contexto de uso
                            <span className="text-xs text-gray-400 ml-2">(ayuda a la IA a elegir)</span>
                        </Label>
                        <Textarea
                            id="descripcion"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder={getPlaceholderForType(tipo)}
                            rows={3}
                        />
                        <p className="text-xs text-gray-500">
                            💡 Describe cuándo y cómo debería usarse este audio para que la IA lo seleccione correctamente.
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            ❌ {error}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={!file || !nombre.trim() || isUploading}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Subiendo...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                Subir Audio
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
