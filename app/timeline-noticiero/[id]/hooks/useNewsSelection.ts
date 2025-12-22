import { useState } from 'react'

interface NewsItem {
    id: string
    title: string
    content: string
    type?: string
    category?: string
    duration: number
    audioUrl?: string
}

export function useNewsSelection(timeline: NewsItem[]) {
    const [selectedNews, setSelectedNews] = useState<Set<string>>(new Set())

    const toggleSelection = (newsId: string) => {
        setSelectedNews(prev => {
            const newSet = new Set(prev)
            if (newSet.has(newsId)) {
                newSet.delete(newsId)
            } else {
                newSet.add(newsId)
            }
            return newSet
        })
    }

    const selectAll = () => {
        if (!timeline || timeline.length === 0) return
        const allIds = new Set(timeline.map(n => n.id))
        setSelectedNews(allIds)
    }

    const deselectAll = () => {
        setSelectedNews(new Set())
    }

    const allSelected = timeline && timeline.length > 0
        ? selectedNews.size === timeline.length
        : false

    return {
        selectedNews,
        toggleSelection,
        selectAll,
        deselectAll,
        allSelected
    }
}
