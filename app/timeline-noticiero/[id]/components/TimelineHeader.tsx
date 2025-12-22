import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'

interface TimelineHeaderProps {
    region: string
    newsCount: number
    estado: string
    onBack: () => void
}

export function TimelineHeader({ region, newsCount, estado, onBack }: TimelineHeaderProps) {
    return (
        <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Timeline del Noticiero
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {region} • {newsCount} noticias
                    </p>
                </div>
            </div>
            <Badge
                variant={estado === 'completado' ? 'default' : 'secondary'}
                className="text-sm"
            >
                {estado}
            </Badge>
        </div>
    )
}
