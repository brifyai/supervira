'use client'

import { toast } from 'react-toastify'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, Upload, FileAudio, Type } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSupabaseUser } from '@/hooks/use-supabase-user'

interface CreateCampaignModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function CreateCampaignModal({ open, onOpenChange, onSuccess }: CreateCampaignModalProps) {
    const { session } = useSupabaseUser()
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [type, setType] = useState<'audio' | 'text'>('audio')
    const [file, setFile] = useState<File | null>(null)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast.error('El nombre es obligatorio')
            return
        }

        if (type === 'audio' && !file) {
            toast.error('Debes subir un archivo de audio')
            return
        }

        if (type === 'text' && !description.trim()) {
            toast.error('Debes escribir el guion del anuncio')
            return
        }

        if (!session?.user?.id) {
            toast.error('No estás autenticado')
            return
        }

        // Validación de fechas
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Inicio del día

        if (startDate) {
            const startDateObj = new Date(startDate)
            if (startDateObj < today) {
                toast.error('La fecha de inicio no puede ser anterior a hoy')
                return
            }
        }

        if (endDate && startDate) {
            const startDateObj = new Date(startDate)
            const endDateObj = new Date(endDate)
            if (endDateObj <= startDateObj) {
                toast.error('La fecha de fin debe ser posterior a la fecha de inicio')
                return
            }
        }

        setLoading(true)
        try {
            let audioUrl = null
            let s3Key = null
            let duration = 30 // Default duration

            // 1. Subir audio si aplica
            if (type === 'audio' && file) {
                const formData = new FormData()
                formData.append('file', file)
                formData.append('nombre', name.trim())
                formData.append('tipo', 'publicidad')

                const uploadResponse = await fetch('/api/upload-audio', {
                    method: 'POST',
                    body: formData
                })

                if (!uploadResponse.ok) {
                    const errorData = await uploadResponse.json()
                    throw new Error(errorData.error || 'Error al subir el audio')
                }

                const uploadData = await uploadResponse.json()
                audioUrl = uploadData.audioUrl
                s3Key = uploadData.s3Key

                // Si el backend devuelve duración, usarla (opcional, si se implementa)
                // duration = uploadData.duration || 30 
            } else {
                // Estimación para texto: 150 palabras por minuto
                const words = description.trim().split(/\s+/).length
                duration = Math.ceil((words / 150) * 60)
            }

            // 2. Guardar en base de datos vía API
            const response = await fetch('/api/campaigns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nombre: name,
                    descripcion: description,
                    url_audio: audioUrl,
                    s3_key: s3Key,
                    duracion_segundos: duration,
                    fecha_inicio: startDate || new Date().toISOString(),
                    fecha_fin: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Error al crear la campaña')
            }

            toast.success('Campaña creada exitosamente')
            onSuccess()
            onOpenChange(false)

            // Reset form
            setName('')
            setDescription('')
            setFile(null)
            setType('audio')

        } catch (error: any) {
            console.error('Error creating campaign:', error)
            toast.error(error.message || 'Error al crear la campaña')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Nueva Campaña Publicitaria</DialogTitle>
                    <div className="text-sm text-muted-foreground">
                        Complete los datos para crear una nueva campaña publicitaria.
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Nombre de la Campaña</Label>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ej: Oferta Verano 2025"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Tipo de Anuncio</Label>
                        <RadioGroup value={type} onValueChange={(v: 'audio' | 'text') => setType(v)} className="flex gap-4">
                            <div className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer hover:bg-gray-50 w-full">
                                <RadioGroupItem value="audio" id="r-audio" />
                                <Label htmlFor="r-audio" className="cursor-pointer flex items-center">
                                    <FileAudio className="h-4 w-4 mr-2 text-blue-600" />
                                    Archivo de Audio
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer hover:bg-gray-50 w-full">
                                <RadioGroupItem value="text" id="r-text" />
                                <Label htmlFor="r-text" className="cursor-pointer flex items-center">
                                    <Type className="h-4 w-4 mr-2 text-green-600" />
                                    Guion de Texto (IA)
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {type === 'audio' ? (
                        <div className="space-y-2">
                            <Label>Archivo de Audio (MP3/WAV)</Label>
                            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    accept="audio/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={e => setFile(e.target.files?.[0] || null)}
                                />
                                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                {file ? (
                                    <span className="text-sm font-medium text-blue-600">{file.name}</span>
                                ) : (
                                    <span className="text-sm text-gray-500">Haz clic o arrastra un archivo aquí</span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label>Guion del Anuncio</Label>
                            <Textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Escribe el texto que leerá el locutor..."
                                className="h-32"
                            />
                            <p className="text-xs text-gray-500 text-right">
                                {description.length} caracteres
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Fecha Inicio</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha Fin</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creando...
                            </>
                        ) : (
                            'Crear Campaña'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
