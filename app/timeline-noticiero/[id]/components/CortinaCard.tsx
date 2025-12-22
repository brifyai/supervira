'use client'

import { Clock, Radio, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface CortinaCardProps {
    cortina: {
        id: string
        title: string
        content?: string
        duration: number
        audioUrl?: string
    }
    index: number
    onDelete?: (id: string) => void
}

export function CortinaCard({ cortina, index, onDelete }: CortinaCardProps) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-lg border bg-purple-50 border-purple-200 hover:border-purple-300 transition-colors">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold">
                <Radio className="h-4 w-4" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-gray-900">
                        {cortina.title || 'Cortina musical'}
                    </h3>
                    {onDelete && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                            onClick={() => onDelete(cortina.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {cortina.duration}s
                    </span>
                    <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 bg-purple-50">
                        Cortina
                    </Badge>
                    {cortina.audioUrl ? (
                        <audio
                            controls
                            className="h-6"
                            src={cortina.audioUrl}
                        />
                    ) : (
                        <span className="text-orange-500 text-xs">⚠️ Sin audio asignado</span>
                    )}
                </div>
            </div>
        </div>
    )
}
