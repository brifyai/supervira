'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Minus, Plus } from 'lucide-react'

interface Category {
    id: string
    label: string
    checked: boolean
    count?: number  // Noticias disponibles
    selectedCount?: number  // Noticias a usar
}

interface CategorySelectorProps {
    categories: Category[]
    onCategoryChange: (categoryId: string, checked: boolean, selectedCount?: number) => void
    onOpenNewsModal?: (categoryId: string) => void
    showCounts?: boolean
    maxPerCategory?: number
}

export function CategorySelector({
    categories,
    onCategoryChange,
    onOpenNewsModal,
    showCounts = false,
    maxPerCategory = 10
}: CategorySelectorProps) {
    const selectedCount = categories.filter(c => c.checked).length
    const totalNewsSelected = categories.reduce((sum, c) => sum + (c.selectedCount || 0), 0)

    const handleIncrement = (categoryId: string, currentCount: number, maxCount: number) => {
        const newCount = Math.min(currentCount + 1, maxCount, maxPerCategory)
        const category = categories.find(c => c.id === categoryId)
        if (category) {
            onCategoryChange(categoryId, true, newCount)
        }
    }

    const handleDecrement = (categoryId: string, currentCount: number) => {
        const newCount = Math.max(currentCount - 1, 0)
        const category = categories.find(c => c.id === categoryId)
        if (category) {
            if (newCount === 0) {
                onCategoryChange(categoryId, false, 0)
            } else {
                onCategoryChange(categoryId, true, newCount)
            }
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                    Categorías de Noticias
                </label>
                <div className="flex gap-2">
                    <Badge variant={selectedCount > 0 ? "default" : "secondary"}>
                        {selectedCount} categoría{selectedCount !== 1 ? 's' : ''}
                    </Badge>
                    {showCounts && totalNewsSelected > 0 && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {totalNewsSelected} noticias
                        </Badge>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map((category) => {
                    const available = category.count || 0
                    const selected = category.selectedCount || 0
                    const hasNews = available > 0

                    return (
                        <div
                            key={category.id}
                            className={`flex flex-col p-3 rounded-lg border-2 transition-all ${category.checked
                                ? 'border-blue-500 bg-blue-50'
                                : hasNews
                                    ? 'border-gray-200 hover:border-gray-300'
                                    : 'border-gray-100 bg-gray-50 opacity-60'
                                }`}
                        >
                            {/* Header con checkbox y nombre */}
                            <div
                                className="flex items-center space-x-2 cursor-pointer"
                                onClick={() => {
                                    if (hasNews || !showCounts) {
                                        const newChecked = !category.checked
                                        const newCount = newChecked ? Math.min(3, available || 3) : 0
                                        onCategoryChange(category.id, newChecked, showCounts ? newCount : undefined)
                                    }
                                }}
                            >
                                <Checkbox
                                    id={category.id}
                                    checked={category.checked}
                                    disabled={showCounts && !hasNews}
                                    onCheckedChange={(checked) => {
                                        if (hasNews || !showCounts) {
                                            const newCount = checked ? Math.min(3, available || 3) : 0
                                            onCategoryChange(category.id, checked as boolean, showCounts ? newCount : undefined)
                                        }
                                    }}
                                />
                                <label
                                    htmlFor={category.id}
                                    className="text-sm font-medium cursor-pointer flex-1"
                                >
                                    {category.label}
                                </label>

                                {/* Badge de disponibles */}
                                {showCounts && (
                                    <Badge
                                        variant="outline"
                                        className={`text-xs ${hasNews
                                            ? 'bg-green-50 text-green-700 border-green-200'
                                            : 'bg-gray-100 text-gray-500'
                                            }`}
                                    >
                                        {available}
                                    </Badge>
                                )}
                            </div>

                            {/* Selector de cantidad + Botón Ver Noticias */}
                            {showCounts && category.checked && hasNews && (
                                <div className="mt-3 pt-2 border-t border-blue-200 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600">Usar:</span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDecrement(category.id, selected)
                                                }}
                                                className="w-6 h-6 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300 transition-colors"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="w-6 text-center font-semibold text-blue-700">
                                                {selected}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleIncrement(category.id, selected, available)
                                                }}
                                                disabled={selected >= Math.min(available, maxPerCategory)}
                                                className="w-6 h-6 flex items-center justify-center rounded bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>

                                    {onOpenNewsModal && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onOpenNewsModal(category.id)
                                            }}
                                            className="w-full text-xs py-1.5 bg-white border border-blue-300 text-blue-600 rounded hover:bg-blue-50 transition-colors flex items-center justify-center gap-1 font-medium"
                                        >
                                            Ver Noticias
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {selectedCount === 0 && (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    ⚠️ Debes seleccionar al menos una categoría para generar el noticiero
                </p>
            )}
        </div>
    )
}
