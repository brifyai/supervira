import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface NewscastConfig {
    region: string
    radioName?: string  // ✅ NUEVO: Nombre de la radio para la intro
    categories: string[]
    categoryConfig?: any // Configuración detallada de conteos por categoría
    specificNewsUrls?: string[] // URLs específicas seleccionadas
    targetDuration: number
    generateAudioNow: boolean
    frecuencia_anuncios?: number
    adCount?: number
    includeTimeWeather?: boolean
    newsTime?: string
    voiceModel?: string
    voiceWPM?: number // Palabras por minuto de la voz para cálculo preciso
    // ✅ NUEVO: Configuración de voz para TTS
    voiceSettings?: {
        speed?: number      // Velocidad (ej: 13 para +13%)
        pitch?: number      // Tono (ej: 0)
        volume?: number     // Volumen en dB (ej: 2)
        fmRadioEffect?: boolean
        fmRadioIntensity?: number
    }
    timeStrategy?: string
    hora_generacion?: string  // ✅ NUEVO: Hora programada para el noticiero
    userId?: string // ✅ NUEVO: userId para fallback cuando sesión expira
    audioConfig?: {
        cortinas_enabled: boolean
        cortinas_frequency: number
        cortina_default_id: string | null
        cortina_default_url: string | null
        background_music_enabled: boolean
        background_music_id: string | null
        background_music_volume: number
    }
}

interface GenerationResult {
    success: boolean
    newscastId?: string
    timeline?: any[]
    duration?: number
    error?: string
}

export function useNewscastGeneration() {
    const router = useRouter()
    const [isGenerating, setIsGenerating] = useState(false)
    const [progress, setProgress] = useState(0)
    const [status, setStatus] = useState('')
    const [error, setError] = useState<string | null>(null)

    const generateNewscast = async (config: NewscastConfig): Promise<GenerationResult> => {
        setIsGenerating(true)
        setProgress(0)
        setStatus('Iniciando generación...')
        setError(null)

        try {
            // Validaciones básicas
            if (!config.region) {
                throw new Error('Debes seleccionar una región')
            }

            if (config.categories.length === 0) {
                throw new Error('Debes seleccionar al menos una categoría')
            }

            setProgress(10)
            setStatus('Conectando con el servidor...')

            // Llamada real al backend
            const response = await fetch('/api/generate-newscast', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    region: config.region,
                    radioName: config.radioName,  // ✅ NUEVO: Nombre de la radio
                    categories: config.categories,
                    categoryConfig: config.categoryConfig,
                    specificNewsUrls: config.specificNewsUrls,
                    targetDuration: config.targetDuration,
                    generateAudioNow: config.generateAudioNow,
                    frecuencia_anuncios: config.frecuencia_anuncios || 2,
                    adCount: config.adCount,
                    includeTimeWeather: config.includeTimeWeather || false,
                    newsTime: config.newsTime || new Date().toLocaleTimeString('es-CL', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    voiceModel: config.voiceModel || 'default',
                    voiceWPM: config.voiceWPM || 150, // WPM para cálculo de duración
                    voiceSettings: config.voiceSettings, // ✅ NUEVO: Pasar configuración de voz
                    timeStrategy: config.timeStrategy || 'auto',
                    hora_generacion: config.hora_generacion,  // ✅ NUEVO: Hora programada
                    audioConfig: config.audioConfig,
                    userId: config.userId // ✅ NUEVO: enviar para fallback de auth
                })
            })

            setProgress(30)
            setStatus('Procesando respuesta...')

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Error ${response.status}: ${errorText}`)
            }

            const data = await response.json()

            setProgress(90)
            setStatus('Finalizando...')

            if (data.success && data.newscastId) {
                setProgress(100)
                setStatus('¡Noticiero generado exitosamente!')

                // Guardar en localStorage para acceso rápido
                // ✅ Limpiar entradas antiguas primero para evitar quota exceeded
                if (data.timeline) {
                    try {
                        // Eliminar noticieros viejos (mantener solo los últimos 3)
                        const keys = Object.keys(localStorage).filter(k => k.startsWith('newscast_'))
                        if (keys.length > 3) {
                            keys.slice(0, keys.length - 3).forEach(k => localStorage.removeItem(k))
                        }
                        localStorage.setItem(`newscast_${data.newscastId}`, JSON.stringify(data))
                    } catch (e) {
                        // Si aún falla, limpiar todo y reintentar
                        console.warn('localStorage lleno, limpiando cache...')
                        Object.keys(localStorage)
                            .filter(k => k.startsWith('newscast_'))
                            .forEach(k => localStorage.removeItem(k))
                        try {
                            localStorage.setItem(`newscast_${data.newscastId}`, JSON.stringify(data))
                        } catch (e2) {
                            console.error('No se pudo guardar en localStorage:', e2)
                        }
                    }
                }

                return {
                    success: true,
                    newscastId: data.newscastId,
                    timeline: data.timeline,
                    duration: data.duration
                }
            } else {
                throw new Error(data.error || 'Error desconocido al generar noticiero')
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
            setError(errorMessage)
            setStatus('Error en la generación')
            console.error('Error generando noticiero:', err)

            return {
                success: false,
                error: errorMessage
            }
        } finally {
            setIsGenerating(false)
        }
    }

    const navigateToTimeline = (newscastId: string) => {
        router.push(`/timeline-noticiero/${newscastId}`)
    }

    const reset = () => {
        setIsGenerating(false)
        setProgress(0)
        setStatus('')
        setError(null)
    }

    return {
        isGenerating,
        progress,
        status,
        error,
        generateNewscast,
        navigateToTimeline,
        reset
    }
}
