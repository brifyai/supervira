'use client'

import { toast } from 'react-toastify'

import { useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, RefreshCw, CheckCircle } from 'lucide-react'
import { useAvailableNews } from '../hooks/useAvailableNews'

interface AddNewsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    region: string
    newscastId: string
    onNewsAdded: () => void
}

export function AddNewsModal({
    open,
    onOpenChange,
    region,
    newscastId,
    onNewsAdded
}: AddNewsModalProps) {
    const {
        availableNews,
        loading,
        searchTerm,
        setSearchTerm,
        loadNews,
        addToTimeline,
        usingFallback
    } = useAvailableNews(region)

    useEffect(() => {
        if (open) {
            loadNews()
        }
    }, [open])

    const handleAddNews = async (newsId: string) => {
        try {
            await addToTimeline(newsId, newscastId)
            toast.success(' Noticia agregada exitosamente')
            onNewsAdded()
            // No cerrar el modal para permitir agregar más noticias
            loadNews() // Recargar lista
        } catch (err) {
            toast.error(`Error: ${err instanceof Error ? err.message : 'Error agregando noticia'}`)
        }
    }

    const getSentimentBadge = (sentiment?: string) => {
        if (!sentiment) return null
        const colors = {
            positive: 'bg-green-100 text-green-800 border-green-200',
            neutral: 'bg-gray-100 text-gray-800 border-gray-200',
            negative: 'bg-red-100 text-red-800 border-red-200'
        }
        return (
            <Badge variant="outline" className={`text-xs ${colors[sentiment as keyof typeof colors] || colors.neutral}`}>
                {sentiment}
            </Badge>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle className="text-xl">Agregar Nueva Noticia</DialogTitle>
                        <p className="text-sm text-gray-500 mt-1">
                            📰 {region && region !== 'Sin región'
                                ? `Fuentes y Noticias de la Región: ${region}`
                                : 'Noticias Nacionales'}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadNews}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </Button>
                </DialogHeader>

                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    <Input
                        placeholder="Buscar noticias..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loadNews()}
                        className="w-full"
                    />

                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="text-center">
                                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                                <p className="text-gray-600">Cargando noticias...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                            {/* Mensaje de fallback */}
                            {usingFallback && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold">!</div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-amber-900">
                                                No hay noticias disponibles para la región {region}
                                            </p>
                                            <p className="text-xs text-amber-700 mt-1">
                                                Mostrando noticias nacionales como alternativa
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {availableNews.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-500 text-lg">No hay noticias disponibles</p>
                                    <p className="text-gray-400 text-sm mt-2">
                                        Intenta buscar con otros términos o actualiza la lista
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm text-gray-600">
                                            {availableNews.length} noticia{availableNews.length !== 1 ? 's' : ''} disponible{availableNews.length !== 1 ? 's' : ''}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                                ✓ Lista
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                normal
                                            </Badge>
                                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                                positive
                                            </Badge>
                                        </div>
                                    </div>

                                    {availableNews.map((news) => (
                                        <div
                                            key={news.id}
                                            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors bg-white shadow-sm"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start gap-3 mb-2">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                                                ✓ Lista
                                                            </Badge>
                                                            <Badge variant="outline" className="text-xs">
                                                                normal
                                                            </Badge>
                                                            {getSentimentBadge(news.sentimiento)}
                                                        </div>
                                                    </div>

                                                    <h4 className="font-semibold text-base text-gray-900 mb-2 leading-tight">
                                                        {news.titulo}
                                                    </h4>

                                                    <p className="text-sm text-gray-600 line-clamp-3 mb-3 leading-relaxed">
                                                        {news.contenido}
                                                    </p>

                                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                                        <span className="font-medium">Categoría: {news.categoria || 'general'}</span>
                                                        <span>•</span>
                                                        <span>Región: {news.region || region}</span>
                                                        <span>•</span>
                                                        <span>Publicado: {new Date(news.fecha_scraping).toLocaleDateString('es-CL')}</span>
                                                    </div>
                                                </div>

                                                <Button
                                                    size="sm"
                                                    onClick={() => handleAddNews(news.id)}
                                                    className="flex-shrink-0"
                                                >
                                                    <Plus className="h-4 w-4 mr-1" />
                                                    Agregar
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}

                    <div className="pt-3 border-t flex items-center justify-between text-xs text-gray-500">
                        <span>0 noticia(s) seleccionada(s)</span>
                        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
