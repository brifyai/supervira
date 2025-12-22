'use client'

import { Slider } from '@/components/ui/slider'
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import {
    CORRECTION_FACTOR,
    INTRO_DURATION,
    OUTRO_DURATION,
    AD_DURATION,
    SILENCE_GAP,
    WORDS_PER_NEWS
} from '@/lib/duration-constants'

interface DurationSliderProps {
    duration: number
    onDurationChange: (duration: number) => void
    min?: number
    max?: number
    step?: number
    selectedNewsCount?: number  // Noticias seleccionadas actualmente
    voiceWPM?: number           // WPM de la voz seleccionada
    voiceSpeed?: number         // Velocidad configurada (+13 default)
}

export function DurationSlider({
    duration,
    onDurationChange,
    min = 5,
    max = 60,
    step = 1,
    selectedNewsCount = 0,
    voiceWPM = 175,
    voiceSpeed = 13
}: DurationSliderProps) {
    // Calcular WPM efectivo igual que el backend
    const speedAdjustment = 1 + (voiceSpeed / 100)
    const effectiveWPM = Math.round(voiceWPM * speedAdjustment * CORRECTION_FACTOR)

    // Calcular segundos por noticia (sincronizado con backend)
    const avgSecondsPerNews = Math.round((WORDS_PER_NEWS / effectiveWPM) * 60)

    // Calcular tiempo disponible para noticias
    const targetSeconds = duration * 60
    const reservedTime = INTRO_DURATION + OUTRO_DURATION + (AD_DURATION * 2) // 2 publicidades typical
    const newsTimeAvailable = targetSeconds - reservedTime

    // Calcular máximo de noticias que caben (misma fórmula que backend)
    const maxNewsForDuration = Math.floor(
        (newsTimeAvailable + SILENCE_GAP) / (avgSecondsPerNews + SILENCE_GAP)
    )

    // Rango recomendado
    const recommendedNewsMin = Math.max(1, maxNewsForDuration - 2)
    const recommendedNewsMax = maxNewsForDuration

    // Estados de validación
    const hasExcess = selectedNewsCount > maxNewsForDuration
    const isNewsCountOk = selectedNewsCount >= recommendedNewsMin && selectedNewsCount <= maxNewsForDuration
    const newsDeficit = recommendedNewsMin - selectedNewsCount
    const newsExcess = selectedNewsCount - maxNewsForDuration

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Duración del Noticiero
                </label>
                <span className="text-2xl font-bold text-blue-600">
                    {duration} min
                </span>
            </div>

            <Slider
                value={[duration]}
                onValueChange={(value) => onDurationChange(value[0])}
                min={min}
                max={max}
                step={step}
                className="w-full"
            />

            <div className="flex justify-between text-xs text-gray-500">
                <span>{min} min</span>
                <span>{max} min</span>
            </div>

            {/* Guía de cantidad de noticias */}
            <div className={`rounded-lg p-3 border ${selectedNewsCount === 0
                ? 'bg-blue-50 border-blue-200'
                : hasExcess
                    ? 'bg-red-50 border-red-200'
                    : isNewsCountOk
                        ? 'bg-green-50 border-green-200'
                        : 'bg-amber-50 border-amber-200'
                }`}>
                {selectedNewsCount === 0 ? (
                    // Sin noticias seleccionadas - mostrar recomendación
                    <div className="text-sm text-blue-700">
                        <p className="font-medium">📰 Recomendación para {duration} minutos:</p>
                        <p className="mt-1">
                            Selecciona entre <strong>{recommendedNewsMin}</strong> y <strong>{recommendedNewsMax}</strong> noticias
                        </p>
                    </div>
                ) : hasExcess ? (
                    // ❌ DEMASIADAS NOTICIAS - advertencia crítica
                    <div className="flex items-start text-sm text-red-700">
                        <XCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium">❌ Demasiadas noticias para {duration} minutos</p>
                            <p className="text-xs text-red-600 mt-0.5">
                                Tienes {selectedNewsCount} pero solo caben <strong>{maxNewsForDuration}</strong> noticias
                            </p>
                            <p className="text-xs text-red-600 font-medium">
                                ⚠️ Se descartarán {newsExcess} noticia(s) al generar
                            </p>
                            <p className="text-xs text-red-500 mt-1">
                                Solución: Reduce noticias o aumenta duración a ~{Math.ceil((selectedNewsCount * (avgSecondsPerNews + SILENCE_GAP) + reservedTime) / 60)} min
                            </p>
                        </div>
                    </div>
                ) : isNewsCountOk ? (
                    // Suficientes noticias
                    <div className="flex items-start text-sm text-green-700">
                        <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium">✅ {selectedNewsCount} noticias seleccionadas</p>
                            <p className="text-xs text-green-600 mt-0.5">
                                Perfecto para {duration} minutos (máximo: {maxNewsForDuration})
                            </p>
                        </div>
                    </div>
                ) : (
                    // Faltan noticias
                    <div className="flex items-start text-sm text-amber-700">
                        <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium">⚠️ Pocas noticias para {duration} minutos</p>
                            <p className="text-xs text-amber-600 mt-0.5">
                                Tienes {selectedNewsCount} pero necesitas al menos <strong>{recommendedNewsMin}</strong> noticias
                            </p>
                            <p className="text-xs text-amber-600">
                                Agrega {newsDeficit} más o reduce la duración a ~{Math.max(5, Math.ceil((selectedNewsCount * (avgSecondsPerNews + SILENCE_GAP) + reservedTime) / 60))} min
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
