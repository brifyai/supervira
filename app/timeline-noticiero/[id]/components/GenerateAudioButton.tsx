'use client'

import { toast } from 'react-toastify'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Music } from 'lucide-react'

interface GenerateAudioButtonProps {
    newscastId: string
    selectedNewsIds: string[]
    disabled: boolean
    targetDuration?: number
    onSuccess: (audioUrl: string) => void
    onGeneratingChange?: (isGenerating: boolean) => void
}

export function GenerateAudioButton({
    newscastId,
    selectedNewsIds,
    disabled,
    targetDuration,
    onSuccess,
    onGeneratingChange
}: GenerateAudioButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false)

    const updateGenerating = (value: boolean) => {
        setIsGenerating(value)
        onGeneratingChange?.(value)
    }

    const handleGenerate = async () => {
        if (selectedNewsIds.length === 0) {
            toast.warning(' Selecciona al menos una noticia para generar el audio')
            return
        }

        try {
            updateGenerating(true)
            const response = await fetch('/api/finalize-newscast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newscastId,
                    selectedNewsIds,
                    includeMusic: false,
                    includeFx: false,
                    forceExactDuration: false, // Disabled to prevent audio stretching (using Smart Assembly instead)
                    targetDuration
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Error al finalizar')
            }

            if (data.success) {
                toast.success(` Audio generado exitosamente con ${selectedNewsIds.length} noticias seleccionadas`)
                onSuccess(data.audioUrl)
            }

        } catch (err) {
            console.error('❌ Error finalizando:', err)
            toast.error(`Error: ${err instanceof Error ? err.message : 'Error desconocido'}`)
        } finally {
            updateGenerating(false)
        }
    }

    return (
        <Button
            onClick={handleGenerate}
            disabled={disabled || isGenerating}
            className="flex-1"
            size="lg"
        >
            {isGenerating ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generando Audio Final...
                </>
            ) : (
                <>
                    <Music className="mr-2 h-5 w-5" />
                    Generar Audio ({selectedNewsIds.length} seleccionadas)
                </>
            )}
        </Button>
    )
}
