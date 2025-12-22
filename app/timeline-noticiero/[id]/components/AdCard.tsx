import { Megaphone, Trash2, Clock, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AdItem {
    id: string
    title: string
    content: string
    audioUrl?: string | null
    type: 'ad'
    duration: number
    campaignId?: string
}

interface AdCardProps {
    ad: AdItem
    index: number
    onDelete?: (id: string) => void
}

export function AdCard({ ad, index, onDelete }: AdCardProps) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-lg border bg-amber-50 border-amber-200 hover:border-amber-300 transition-colors">
            <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-semibold">
                <Megaphone className="h-4 w-4" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-gray-900">
                        Espacio Publicitario: {ad.title}
                    </h3>
                    {onDelete && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                            onClick={() => onDelete(ad.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {ad.audioUrl ? (
                    <div className="flex items-center gap-2 mb-2">
                        <Volume2 className="h-4 w-4 text-amber-600" />
                        <audio controls className="h-8 flex-1" preload="metadata">
                            <source src={ad.audioUrl} type="audio/mpeg" />
                        </audio>
                    </div>
                ) : (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2 italic">
                        {ad.content}
                    </p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ad.duration}s
                    </span>
                    <Badge variant="outline" className="text-xs border-amber-200 text-amber-700 bg-amber-50">
                        Publicidad
                    </Badge>
                </div>
            </div>
        </div>
    )
}
