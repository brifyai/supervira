'use client'

import { toast } from 'react-toastify'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Loader2, Wand2, Clock, Gauge } from 'lucide-react'
interface AdjustDurationModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    currentDuration: number
    newscastId: string
    onSuccess: () => void
}

export function AdjustDurationModal({
    open,
    onOpenChange,
    currentDuration,
    newscastId,
    onSuccess
}: AdjustDurationModalProps) {
    const [targetDuration, setTargetDuration] = useState(currentDuration)
    const [readingPace, setReadingPace] = useState<number>(12.5)
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<'config' | 'processing' | 'success'>('config')

    useEffect(() => {
        if (open) {
            setTargetDuration(currentDuration)
            setReadingPace(12.5)
            setStep('config')
        }
    }, [open, currentDuration])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const getPaceLabel = (pace: number) => {
        if (pace < 11.5) return "Lento (Pausado)"
        if (pace > 13.5) return "Rápido (Dinámico)"
        return "Normal (Estándar)"
    }

    const handleAdjust = async () => {
        setLoading(true)
        setStep('processing')

        try {
            const response = await fetch('/api/adjust-duration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newscastId,
                    targetDuration,
                    readingPace
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Error al ajustar duración')
            }

            setStep('success')
            toast.success('Duración ajustada exitosamente')

            setTimeout(() => {
                onSuccess()
                onOpenChange(false)
            }, 1500)

        } catch (error) {
            console.error('Error adjusting duration:', error)
            toast.error(error instanceof Error ? error.message : 'Error desconocido')
            setStep('config')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-purple-600" />
                        Ajuste Inteligente de Duración
                    </DialogTitle>
                    <DialogDescription>
                        La IA reescribirá las noticias para ajustarse al tiempo objetivo.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6">
                    {step === 'config' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                                <div>
                                    <Label className="text-gray-500">Duración Actual</Label>
                                    <div className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-gray-400" />
                                        {formatTime(currentDuration)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Label className="text-purple-600 font-semibold">Objetivo</Label>
                                    <div className="text-2xl font-bold text-purple-700">
                                        {formatTime(targetDuration)}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <Label>Ajustar tiempo objetivo (minutos)</Label>
                                    <span className="text-sm text-gray-500">{Math.round(targetDuration / 60)} min</span>
                                </div>
                                <Slider
                                    value={[targetDuration]}
                                    min={300} // 5 min
                                    max={3600} // 60 min
                                    step={60} // 1 min steps
                                    onValueChange={(vals) => setTargetDuration(vals[0])}
                                    className="py-4"
                                />
                                <p className="text-xs text-gray-500 text-center">
                                    Desliza para cambiar la duración deseada
                                </p>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <div className="flex justify-between items-center">
                                    <Label>Ritmo de Lectura</Label>
                                    <span className="text-sm font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                        {getPaceLabel(readingPace)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4">
                                    <Gauge className="h-6 w-6 text-gray-400" />
                                    <div className="flex-1">
                                        <Slider
                                            value={[readingPace]}
                                            min={10}
                                            max={15}
                                            step={0.5}
                                            onValueChange={(vals) => setReadingPace(vals[0])}
                                            className="py-2"
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>Lento (10 cps)</span>
                                            <span>Rápido (15 cps)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700">
                                ℹ️ <strong>Nota:</strong> Este proceso consumirá tokens de IA para reescribir el contenido. Los audios existentes serán eliminados y deberán regenerarse.
                            </div>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900">Ajustando contenido...</h3>
                            <p className="text-gray-500 max-w-xs mt-2">
                                La IA está reescribiendo las noticias para que encajen en {formatTime(targetDuration)}.
                            </p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                <Wand2 className="h-6 w-6 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-green-700">¡Ajuste Completado!</h3>
                            <p className="text-gray-600 mt-2">
                                El noticiero ahora dura aproximadamente {formatTime(targetDuration)}.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {step === 'config' && (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleAdjust}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                                disabled={targetDuration === currentDuration}
                            >
                                <Wand2 className="mr-2 h-4 w-4" />
                                Aplicar Ajuste
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
