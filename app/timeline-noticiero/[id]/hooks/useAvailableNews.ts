import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useAvailableNews(region?: string) {
    const [availableNews, setAvailableNews] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [usingFallback, setUsingFallback] = useState(false) // Nuevo estado para indicar fallback

    const loadNews = async () => {
        try {
            setLoading(true)
            setUsingFallback(false)

            const params = new URLSearchParams({
                limit: '50'
            })

            // Si hay región válida, buscar por región, sino buscar nacionales
            if (region && region !== 'Sin región') {
                params.append('region', region)
            } else {
                params.append('category', 'nacionales')
            }

            if (searchTerm) {
                params.append('search', searchTerm)
            }

            console.log(`📰 Buscando noticias: region=${region}, search=${searchTerm}`)
            const response = await fetch(`/api/available-news?${params}`)
            const data = await response.json()

            if (data.success) {
                // Si no hay noticias y la región no es Nacional, intentar con noticias nacionales
                if (data.news.length === 0 && region && region !== 'Nacional' && region !== 'Sin región') {
                    console.log(`⚠️ No hay noticias para ${region}, buscando noticias nacionales...`)

                    const fallbackParams = new URLSearchParams({
                        limit: '50',
                        region: 'Nacional'
                    })

                    if (searchTerm) {
                        fallbackParams.append('search', searchTerm)
                    }

                    const fallbackResponse = await fetch(`/api/available-news?${fallbackParams}`)
                    const fallbackData = await fallbackResponse.json()

                    if (fallbackData.success && fallbackData.news.length > 0) {
                        console.log(`✅ Mostrando ${fallbackData.news.length} noticias nacionales como fallback`)
                        setAvailableNews(fallbackData.news)
                        setUsingFallback(true)
                    } else {
                        setAvailableNews([])
                    }
                } else {
                    setAvailableNews(data.news)
                }
            } else {
                console.error('Error en respuesta:', data.error)
                setAvailableNews([])
            }
        } catch (err) {
            console.error('Error cargando noticias:', err)
            setAvailableNews([])
        } finally {
            setLoading(false)
        }
    }

    const addToTimeline = async (newsId: string, newscastId: string) => {
        try {
            const response = await fetch('/api/add-news-to-timeline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newscastId,
                    newsId
                })
            })

            const data = await response.json()

            if (data.success) {
                return { success: true, timeline: data.timeline }
            } else {
                throw new Error(data.error || 'Error agregando noticia')
            }
        } catch (err) {
            console.error('Error agregando noticia:', err)
            throw err
        }
    }

    return {
        availableNews,
        loading,
        searchTerm,
        setSearchTerm,
        loadNews,
        addToTimeline,
        usingFallback // Nuevo: indica si se está mostrando fallback nacional
    }
}
