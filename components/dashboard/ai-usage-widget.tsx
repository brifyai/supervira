'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Cpu, Brain, Zap, DollarSign } from 'lucide-react'

interface TokenMetrics {
    total_tokens: number
    total_cost: number
    by_service: Record<string, { tokens: number; cost: number; count: number }>
    by_operation: Record<string, { tokens: number; cost: number; count: number }>
    total_requests: number
}

const SERVICE_LABELS: Record<string, string> = {
    'chutes': 'Chutes AI (Humanización)',
    'abacus': 'Abacus AI (Procesamiento)',
    'groq': 'Groq (Procesamiento)'
}

const SERVICE_ICONS: Record<string, any> = {
    'chutes': Brain,
    'abacus': Cpu,
    'groq': Zap
}

export function AIUsageWidget({ period = 7 }: { period?: number }) {
    const [metrics, setMetrics] = useState<TokenMetrics | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchMetrics()
    }, [period])

    async function fetchMetrics() {
        try {
            const response = await fetch(`/api/analytics/token-usage?period=${period}`)
            const data = await response.json()

            if (data.success) {
                setMetrics(data.metrics)
            }
        } catch (error) {
            console.error('Error fetching AI usage metrics:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Uso de IA - Cargando...</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!metrics) {
        return null
    }

    return (
        <div className="space-y-6">
            {/* Resumen General */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tokens Usados</CardTitle>
                        <Brain className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.total_tokens.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Últimos {period} días
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Costo Total del Período</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${metrics.total_cost.toFixed(4)}</div>
                        <p className="text-xs text-muted-foreground">
                            Basado en uso de tokens
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Requests de IA</CardTitle>
                        <Zap className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.total_requests}</div>
                        <p className="text-xs text-muted-foreground">
                            Total de llamadas API
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Desglose por Servicio */}
            <Card>
                <CardHeader>
                    <CardTitle>Desglose de Uso de Recursos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(metrics.by_service).map(([service, data]) => {
                            const Icon = SERVICE_ICONS[service] || Cpu
                            const label = SERVICE_LABELS[service] || service

                            return (
                                <Card key={service} className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                                    <CardContent className="pt-6">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Icon className="h-4 w-4 text-blue-600" />
                                                    <span className="text-sm font-medium text-gray-700">{label}</span>
                                                </div>
                                                <div className="text-3xl font-bold text-gray-900">
                                                    {data.tokens.toLocaleString()}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    Costo: ${data.cost.toFixed(4)}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {data.count} requests
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Desglose por Operación */}
            <Card>
                <CardHeader>
                    <CardTitle>Por Tipo de Operación</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {Object.entries(metrics.by_operation).map(([operation, data]) => (
                            <div key={operation} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <div className="font-medium capitalize">{operation.replace('_', ' ')}</div>
                                    <div className="text-sm text-gray-600">{data.count} requests</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold">{data.tokens.toLocaleString()} tokens</div>
                                    <div className="text-sm text-gray-600">${data.cost.toFixed(4)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
