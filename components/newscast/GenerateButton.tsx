'use client'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Zap, Loader2, CheckCircle, XCircle } from 'lucide-react'

interface GenerateButtonProps {
    isGenerating: boolean
    progress: number
    status: string
    error: string | null
    onGenerate: () => void
    disabled?: boolean
}

export function GenerateButton({
    isGenerating,
    progress,
    status,
    error,
    onGenerate,
    disabled = false
}: GenerateButtonProps) {
    return (
        <div className="space-y-4">
            <Button
                onClick={onGenerate}
                disabled={isGenerating || disabled}
                className="w-full h-14 text-lg font-semibold"
                size="lg"
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generando... {progress}%
                    </>
                ) : error ? (
                    <>
                        <XCircle className="mr-2 h-5 w-5" />
                        Reintentar
                    </>
                ) : (
                    <>
                        <Zap className="mr-2 h-5 w-5" />
                        Generar Noticiero
                    </>
                )}
            </Button>

            {isGenerating && (
                <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-center text-gray-600">
                        {status}
                    </p>
                </div>
            )}

            {error && !isGenerating && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <XCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-red-800">Error al generar noticiero</p>
                            <p className="text-sm text-red-600 mt-1">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {!isGenerating && !error && progress === 100 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <p className="text-sm font-medium text-green-800">
                            ¡Noticiero generado exitosamente!
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
