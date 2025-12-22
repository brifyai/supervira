import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Wand2 } from 'lucide-react'
import { AdjustDurationModal } from './AdjustDurationModal'

interface TimelineSummaryProps {
    totalDuration: number
    targetDuration: number
    newsCount: number
    region: string
    estado: string
    newscastId: string
    onReload: () => void
}

export function TimelineSummary({
    totalDuration,
    targetDuration,
    newsCount,
    region,
    estado,
    newscastId,
    onReload
}: TimelineSummaryProps) {
    const [showAdjustModal, setShowAdjustModal] = useState(false)

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const progressPercent = Math.min(Math.round((totalDuration / targetDuration) * 100), 100)
    const isOverTime = totalDuration > targetDuration

    return (
        <>
            <Card className="mb-6">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle>Resumen del Noticiero</CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-purple-600 border-purple-200 hover:bg-purple-50"
                        onClick={() => setShowAdjustModal(true)}
                    >
                        <Wand2 className="mr-2 h-4 w-4" />
                        Ajuste Inteligente
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                            <p className="text-sm text-gray-600">Duración Total</p>
                            <p className={`text-2xl font-bold ${isOverTime ? 'text-red-600' : 'text-blue-600'}`}>
                                {formatDuration(totalDuration)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Noticias</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {newsCount}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Región</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {region}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Estado</p>
                            <p className="text-lg font-semibold text-gray-900 capitalize">
                                {estado}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Progreso ({formatDuration(totalDuration)} / {formatDuration(targetDuration)})</span>
                            <span className={isOverTime ? 'text-red-600 font-medium' : ''}>
                                {Math.round((totalDuration / targetDuration) * 100)}%
                            </span>
                        </div>
                        <Progress
                            value={progressPercent}
                            className={`h-2 ${isOverTime ? '[&>div]:bg-red-500' : ''}`}
                        />
                        {isOverTime && (
                            <p className="text-xs text-red-500 mt-1">
                                ⚠️ El noticiero excede la duración objetivo. Usa el "Ajuste Inteligente" para corregirlo.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <AdjustDurationModal
                open={showAdjustModal}
                onOpenChange={setShowAdjustModal}
                currentDuration={totalDuration}
                newscastId={newscastId}
                onSuccess={onReload}
            />
        </>
    )
}
