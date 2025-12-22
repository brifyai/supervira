import { Button } from '@/components/ui/button'
import { CheckSquare, Square, Plus, Megaphone, Music, Volume2 } from 'lucide-react'

interface SelectionControlsProps {
    selectedCount: number
    totalCount: number
    allSelected: boolean
    onSelectAll: () => void
    onDeselectAll: () => void
    onAddNews: () => void
    onAddAd: () => void
    onAddAudio?: () => void
    onConfigureMusic?: () => void
    hasMusicConfigured?: boolean
    disabled?: boolean
}

export function SelectionControls({
    selectedCount,
    totalCount,
    allSelected,
    onSelectAll,
    onDeselectAll,
    onAddNews,
    onAddAd,
    onAddAudio,
    onConfigureMusic,
    hasMusicConfigured,
    disabled = false
}: SelectionControlsProps) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <Button
                variant="outline"
                size="sm"
                onClick={allSelected ? onDeselectAll : onSelectAll}
            >
                {allSelected ? (
                    <>
                        <Square className="mr-2 h-4 w-4" />
                        Deseleccionar
                    </>
                ) : (
                    <>
                        <CheckSquare className="mr-2 h-4 w-4" />
                        Seleccionar Todas
                    </>
                )}
                <span className="ml-2 text-xs text-gray-500">
                    ({selectedCount}/{totalCount})
                </span>
            </Button>
            {onAddAudio && !disabled && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddAudio}
                    className="text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                    <Music className="mr-2 h-4 w-4" />
                    Cortina
                </Button>
            )}
            {onConfigureMusic && !disabled && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onConfigureMusic}
                    className={hasMusicConfigured
                        ? "text-blue-600 border-blue-300 bg-blue-50 hover:bg-blue-100"
                        : "text-blue-600 border-blue-200 hover:bg-blue-50"
                    }
                >
                    <Volume2 className="mr-2 h-4 w-4" />
                    {hasMusicConfigured ? '🎵 Música' : 'Música'}
                </Button>
            )}
            {!disabled && (
                <Button variant="outline" size="sm" onClick={onAddAd} className="text-amber-600 border-amber-200 hover:bg-amber-50">
                    <Megaphone className="mr-2 h-4 w-4" />
                    Publicidad
                </Button>
            )}
            {!disabled && (
                <Button variant="outline" size="sm" onClick={onAddNews}>
                    <Plus className="mr-2 h-4 w-4" />
                    Noticia
                </Button>
            )}
        </div>
    )
}
