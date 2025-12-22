import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { NewsCard } from './NewsCard'
import { AdCard } from './AdCard'
import { CortinaCard } from './CortinaCard'
import { GripVertical } from 'lucide-react'

interface SortableNewsCardProps {
    id: string
    news: any
    index: number
    selected: boolean
    onToggleSelection: (id: string) => void
    onUpdateContent: (id: string, content: string, version: string) => void
    onUpdateAudio: (id: string, url: string, duration: number) => void
    onDelete: (id: string) => void
    disabled?: boolean
}

export function SortableNewsCard({ id, news, disabled = false, ...props }: SortableNewsCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id, disabled })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as const,
    }

    // Determinar qué tipo de card renderizar
    const renderCard = () => {
        const type = news.type?.toLowerCase()

        if (type === 'ad' || type === 'advertisement') {
            return <AdCard ad={news} index={props.index} onDelete={disabled ? undefined : props.onDelete} />
        }

        if (type === 'cortina' || type === 'audio') {
            return <CortinaCard cortina={news} index={props.index} onDelete={disabled ? undefined : props.onDelete} />
        }

        // Default: NewsCard
        return <NewsCard news={news} {...props} disabled={disabled} />
    }

    return (
        <div ref={setNodeRef} style={style} className="group relative flex items-start gap-2">
            {!disabled && (
                <div
                    {...attributes}
                    {...listeners}
                    className="mt-8 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                >
                    <GripVertical className="h-5 w-5" />
                </div>
            )}
            {disabled && (
                <div className="mt-8 w-5" />
            )}
            <div className="flex-1">
                {renderCard()}
            </div>
        </div>
    )
}
