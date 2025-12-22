import { useState } from 'react'
import { toast } from 'react-toastify'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Clock, Mic, Edit2, RefreshCw, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { AudioPlayer } from './AudioPlayer'
import { NewsEditor } from './NewsEditor'
interface NewsItem {
    id: string
    title: string
    content: string
    type?: string
    category?: string
    duration: number
    audioUrl?: string
    versions?: {
        original: string
        rewritten?: string
        humanized?: string
    }
    activeVersion?: 'original' | 'rewritten' | 'humanized'
}

import { Trash2 } from 'lucide-react'

interface NewsCardProps {
    news: NewsItem
    index: number
    selected: boolean
    onToggleSelection: (id: string) => void
    onUpdateContent?: (id: string, newContent: string, version: string) => void
    onUpdateAudio?: (id: string, audioUrl: string, duration: number) => void
    onDelete?: (id: string) => void
    disabled?: boolean
}

export function NewsCard({ news, index, selected, onToggleSelection, onUpdateContent, onUpdateAudio, onDelete, disabled = false }: NewsCardProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [isRegenerating, setIsRegenerating] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleSaveContent = (content: string, version: string) => {
        if (onUpdateContent) {
            onUpdateContent(news.id, content, version)
        }
        // No cerramos edición automáticamente para permitir regenerar audio
    }

    const handleRegenerateAudio = async () => {
        if (!news.content) return

        setIsRegenerating(true)
        try {
            const response = await fetch('/api/timeline/regenerate-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: news.content,
                    newsId: news.id,
                    // newscastId se pasaría si tuviéramos el contexto, por ahora opcional
                })
            })

            if (!response.ok) throw new Error('Error regenerando audio')

            const data = await response.json()

            if (onUpdateAudio) {
                onUpdateAudio(news.id, data.audioUrl, data.duration)
            }
            toast.success('Audio regenerado correctamente')
            setIsEditing(false) // Cerramos edición al terminar
        } catch (error) {
            console.error(error)
            toast.error('Error al regenerar audio')
        } finally {
            setIsRegenerating(false)
        }
    }

    if (isEditing) {
        return (
            <div className="mb-4 space-y-4">
                <NewsEditor
                    initialContent={news.content}
                    versions={news.versions || { original: news.content }}
                    activeVersion={news.activeVersion || 'original'}
                    onSave={handleSaveContent}
                    onCancel={() => setIsEditing(false)}
                />

                <div className="flex justify-end bg-gray-50 p-3 rounded-lg border border-dashed">
                    <Button
                        onClick={handleRegenerateAudio}
                        disabled={isRegenerating}
                        variant="secondary"
                        className="w-full sm:w-auto"
                    >
                        {isRegenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generando Audio...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Regenerar Audio con Texto Actual
                            </>
                        )}
                    </Button>
                </div>
            </div>
        )
    }

    const isAd = news.type === 'advertisement' || news.type === 'ad'

    return (
        <div
            className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${selected
                ? 'bg-blue-50 border-blue-300'
                : isAd
                    ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
                    : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                }`}
        >
            <Checkbox
                checked={selected}
                onCheckedChange={() => onToggleSelection(news.id)}
                className="mt-1"
                disabled={disabled}
            />
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold ${isAd ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                }`}>
                {isAd ? 'AD' : index + 1}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-gray-900">
                        {news.title}
                    </h3>
                    <div className="flex gap-2">
                        {!disabled && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
                                onClick={() => setIsEditing(true)}
                            >
                                <Edit2 className="h-4 w-4" />
                            </Button>
                        )}
                        {onDelete && !disabled && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                                onClick={() => onDelete(news.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Contenido de la noticia - expandible */}
                <div className="mb-2">
                    <p className={`text-sm text-gray-600 ${!isExpanded ? 'line-clamp-2' : ''}`}>
                        {news.content}
                    </p>
                    {news.content && news.content.length > 150 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 p-0 h-auto mt-1"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? (
                                <><ChevronUp className="h-3 w-3 mr-1" />Leer menos</>
                            ) : (
                                <><ChevronDown className="h-3 w-3 mr-1" />Leer más</>
                            )}
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(news.duration)}
                    </span>
                    {news.category && (
                        <Badge variant="outline" className="text-xs">
                            {news.category}
                        </Badge>
                    )}
                    {news.audioUrl && (
                        <span className="flex items-center gap-1 text-green-600">
                            <Mic className="h-3 w-3" />
                            Audio disponible
                        </span>
                    )}
                </div>

                {news.audioUrl && (
                    <div className="mt-2">
                        <AudioPlayer src={news.audioUrl} />
                    </div>
                )}
            </div>
        </div>
    )
}
