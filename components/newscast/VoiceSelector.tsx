import { useState, useEffect, useRef } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Mic } from 'lucide-react'

interface Voice {
    id: string
    name: string
    language: string
    isUserVoice?: boolean
    wpm?: number
    tempo?: number
    avg_pause_ms?: number
    energy_profile?: string
}

interface VoiceSelectorProps {
    value: string
    onChange: (value: string, wpm?: number) => void
    disabled?: boolean
    showOnlyUserVoices?: boolean
}

export function VoiceSelector({ value, onChange, disabled, showOnlyUserVoices }: VoiceSelectorProps) {
    const [voices, setVoices] = useState<Voice[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const onChangeRef = useRef(onChange)
    const valueRef = useRef(value)
    const hasInitialized = useRef(false)

    // Mantener refs actualizadas
    useEffect(() => {
        onChangeRef.current = onChange
        valueRef.current = value
    }, [onChange, value])

    // Cargar voces
    useEffect(() => {
        async function loadVoices() {
            setLoading(true)
            try {
                const response = await fetch('/api/text-to-speech/voices')
                if (response.ok) {
                    const data = await response.json()
                    let loadedVoices = data.voices || []

                    if (showOnlyUserVoices) {
                        loadedVoices = loadedVoices.filter((v: Voice) => v.isUserVoice)
                    }

                    setVoices(loadedVoices)
                    console.log('[VoiceSelector] Loaded voices with WPM:', loadedVoices.map((v: Voice) => ({ name: v.name, wpm: v.wpm })))
                } else {
                    console.error('Error fetching voices')
                    setError('Error al cargar voces')
                }
            } catch (err) {
                console.error('Error fetching voices:', err)
                setError('Error de conexión')
            } finally {
                setLoading(false)
            }
        }

        loadVoices()
    }, [showOnlyUserVoices])

    // Sincronizar WPM cuando las voces se cargan (solo una vez)
    useEffect(() => {
        if (voices.length > 0 && !hasInitialized.current) {
            hasInitialized.current = true

            // Buscar la voz actual o seleccionar la primera
            const currentVoice = voices.find(v => v.id === valueRef.current)
            if (currentVoice) {
                console.log(`[VoiceSelector] ✅ Syncing WPM for ${currentVoice.name}: ${currentVoice.wpm}`)
                onChangeRef.current(currentVoice.id, currentVoice.wpm || 150)
            } else if (voices.length > 0) {
                const firstVoice = voices[0]
                console.log(`[VoiceSelector] ✅ Auto-selecting ${firstVoice.name} with WPM: ${firstVoice.wpm}`)
                onChangeRef.current(firstVoice.id, firstVoice.wpm || 150)
            }
        }
    }, [voices])

    const handleChange = (voiceId: string) => {
        const selectedVoice = voices.find(v => v.id === voiceId)
        const wpm = selectedVoice?.wpm || 150
        console.log(`[VoiceSelector] Selected voice ${voiceId} with WPM: ${wpm}`)
        onChange(voiceId, wpm)
    }

    return (
        <div className="space-y-2">
            <Label className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-blue-600" />
                Voz del Locutor
            </Label>
            <Select value={value} onValueChange={handleChange} disabled={disabled || loading}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder={loading ? "Cargando voces..." : "Seleccionar voz"} />
                </SelectTrigger>
                <SelectContent>
                    {voices.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                            <div className="flex justify-between items-center w-full">
                                <span>{voice.name}</span>
                                {voice.wpm && (
                                    <span className="text-xs text-gray-500 ml-2">
                                        {Math.round(voice.wpm)} WPM
                                    </span>
                                )}
                            </div>
                        </SelectItem>
                    ))}
                    {voices.length === 0 && !loading && (
                        <SelectItem value="default" disabled>
                            {showOnlyUserVoices ? "No tienes voces clonadas" : "No hay voces disponibles"}
                        </SelectItem>
                    )}
                </SelectContent>
            </Select>
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    )
}
