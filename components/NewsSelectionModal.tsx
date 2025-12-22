import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface NewsItem {
    id?: string
    url: string
    titulo: string
    resumen?: string
    bajada?: string
    categoria: string
    fuente: string
    fecha_publicacion?: string
}

interface NewsSelectionModalProps {
    isOpen: boolean
    onClose: () => void
    category: string
    news: NewsItem[]
    selectedUrls: string[]
    onToggleNews: (url: string) => void
    onSelectAll: (urls: string[]) => void
    onDeselectAll: (urls: string[]) => void
}

export function NewsSelectionModal({
    isOpen,
    onClose,
    category,
    news,
    selectedUrls,
    onToggleNews,
    onSelectAll,
    onDeselectAll
}: NewsSelectionModalProps) {

    // Calcular seleccionados de esta categoría
    const selectedCount = news.filter(n => selectedUrls.includes(n.url)).length
    const allSelected = news.length > 0 && selectedCount === news.length

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <span className="capitalize">{category}</span>
                            <Badge variant="secondary" className="text-sm font-normal">
                                {selectedCount} / {news.length} seleccionadas
                            </Badge>
                        </DialogTitle>

                        <div className="flex gap-2 text-xs">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => allSelected ? onDeselectAll(news.map(n => n.url)) : onSelectAll(news.map(n => n.url))}
                                className="h-8"
                            >
                                {allSelected ? 'Desmarcar Todas' : 'Seleccionar Todas'}
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 max-h-[60vh] overflow-y-auto p-6">
                    {news.length === 0 ? (
                        <p className="text-center text-gray-500 py-10">No hay noticias disponibles en esta categoría.</p>
                    ) : (
                        <div className="space-y-4">
                            {news.map((item, idx) => {
                                const isSelected = selectedUrls.includes(item.url)
                                return (
                                    <div
                                        key={item.url || idx}
                                        className={`
                      flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer
                      ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:bg-gray-50'}
                    `}
                                        onClick={() => onToggleNews(item.url)}
                                    >
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => onToggleNews(item.url)}
                                            className="mt-1"
                                        />
                                        <div className="flex-1 space-y-1">
                                            <h4 className={`text-sm font-medium leading-none ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                                                {item.titulo}
                                            </h4>
                                            {item.bajada && (
                                                <p className="text-xs text-gray-500 line-clamp-2">
                                                    {item.bajada}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge variant="outline" className="text-[10px] h-5">
                                                    {item.fuente}
                                                </Badge>
                                                {item.fecha_publicacion && (() => {
                                                    // ✅ Mostrar fecha relativa (Hoy, Ayer, hace X días)
                                                    const fecha = new Date(item.fecha_publicacion)
                                                    const hoy = new Date()
                                                    const diffDays = Math.floor((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24))

                                                    let textoFecha = ''
                                                    let colorClass = ''

                                                    if (diffDays === 0) {
                                                        textoFecha = '📗 Hoy'
                                                        colorClass = 'bg-green-100 text-green-700'
                                                    } else if (diffDays === 1) {
                                                        textoFecha = '📘 Ayer'
                                                        colorClass = 'bg-blue-100 text-blue-700'
                                                    } else {
                                                        textoFecha = `⚠️ Hace ${diffDays} días`
                                                        colorClass = 'bg-amber-100 text-amber-700'
                                                    }

                                                    return (
                                                        <span className={`text-[10px] px-2 py-0.5 rounded ${colorClass}`}>
                                                            {textoFecha}
                                                        </span>
                                                    )
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter className="px-6 py-4 border-t bg-gray-50">
                    <Button onClick={onClose} className="w-full sm:w-auto">
                        Listo
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
