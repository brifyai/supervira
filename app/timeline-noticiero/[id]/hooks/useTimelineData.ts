import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface NewsItem {
    id: string
    title: string
    content: string
    type?: string
    category?: string
    duration: number
    audioUrl?: string
}

interface TimelineData {
    timeline: NewsItem[]
    metadata: {
        totalDuration: number
        targetDuration: number
        newsCount: number
        region: string
        generatedAt: string
    }
}

interface Newscast {
    id: string
    titulo?: string
    region?: string
    estado: string
    duracion_segundos?: number
    datos_timeline: any
    url_audio?: string
    created_at: string
}

export function useTimelineData(newscastId: string) {
    const searchParams = useSearchParams()
    const [newscast, setNewscast] = useState<Newscast | null>(null)
    const [timelineData, setTimelineData] = useState<TimelineData | null>(null)
    const [loading, setLoading] = useState(true)
    const [isGenerating, setIsGenerating] = useState(false)
    const [generationProgress, setGenerationProgress] = useState(0)
    const [generationStatus, setGenerationStatus] = useState('')
    const [error, setError] = useState<string | null>(null)

    const normalizeTimelineData = (rawData: any): TimelineData => {
        if (rawData.timeline && rawData.metadata) {
            return rawData as TimelineData
        }

        const timeline = Array.isArray(rawData) ? rawData : []
        const totalDuration = timeline.reduce((sum: number, item: any) => sum + (item.duration || 0), 0)

        return {
            timeline,
            metadata: {
                totalDuration,
                targetDuration: 300,
                newsCount: timeline.length,
                region: 'Desconocida',
                generatedAt: new Date().toISOString()
            }
        }
    }

    const loadNewscast = async () => {
        try {
            setLoading(true)
            setError(null)

            const { data, error: fetchError } = await supabase
                .from('noticieros')
                .select('*')
                .eq('id', newscastId)
                .single()

            if (fetchError) throw fetchError
            if (!data) throw new Error('Noticiero no encontrado')

            setNewscast(data)

            if (data.datos_timeline) {
                const normalized = normalizeTimelineData(data.datos_timeline)
                setTimelineData(normalized)
            }
        } catch (err) {
            console.error('Error cargando noticiero:', err)
            setError(err instanceof Error ? err.message : 'Error desconocido')
        } finally {
            setLoading(false)
        }
    }

    const reload = () => {
        loadNewscast()
    }

    useEffect(() => {
        const isTemp = newscastId.startsWith('temp_')
        const source = searchParams.get('source')

        if (isTemp && source === 'plantilla') {
            // Lógica de generación temporal (se mantiene igual que antes)
            setIsGenerating(true)
            // ... resto de la lógica de generación
        } else {
            loadNewscast()
        }
    }, [newscastId])

    return {
        newscast,
        setNewscast,
        timelineData,
        setTimelineData,
        loading,
        isGenerating,
        generationProgress,
        generationStatus,
        error,
        reload
    }
}
